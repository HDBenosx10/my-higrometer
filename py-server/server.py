from fastapi import FastAPI, HTTPException
import httpx
import os
from aiocache import caches
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging


load_dotenv()


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


caches.set_config({
    "default": {
        "cache": "aiocache.SimpleMemoryCache",
        "serializer": {"class": "aiocache.serializers.JsonSerializer"},
        "ttl": 60 * 10,
    }
})


EXTERNAL_API_URL = os.getenv("EXTERNAL_API_URL")
EXPO_PUSH_URL = os.getenv("EXPO_API_NOTIFICATION")
EXPO_TOKEN = os.getenv("EXPO_TOKEN")


async def fetch_humidity():
    cache = caches.get("default")
    cached_humidity = await cache.get("humidity_data")

    if cached_humidity:
        logger.info("Dados de umidade obtidos do cache.")
        return cached_humidity

    try:
        logger.info("Buscando dados de umidade da API externa...")
        async with httpx.AsyncClient() as client:
            response = await client.get(EXTERNAL_API_URL)
            response.raise_for_status()
            humidity_data = response.json()
            await cache.set("humidity_data", humidity_data)
            logger.info("Dados de umidade obtidos com sucesso e armazenados no cache.")
            return humidity_data
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro ao obter dados da API externa: {e}")
        raise HTTPException(status_code=e.response.status_code, detail="Erro ao obter os dados da API externa")
    except httpx.RequestError as e:
        logger.error(f"Erro de solicitação: {e}")
        raise HTTPException(status_code=503, detail="Serviço indisponível")


async def send_push_notification(message: str):
    try:
        logger.info("Enviando notificação push...")
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json={
                "to": EXPO_TOKEN,
                "sound": "default",
                "title": "Alerta de Umidade",
                "body": message,
            })
            response.raise_for_status()
            logger.info("Notificação push enviada com sucesso.")
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro ao enviar notificação push: {e}")
    except httpx.RequestError as e:
        logger.error(f"Erro de solicitação ao enviar notificação push: {e}")


async def check_humidity_and_notify():
    logger.info("Iniciando verificação de umidade...")
    try:
        humidity_data = await fetch_humidity()
        humidity_level = humidity_data.get("humidity")
        
        if humidity_level is not None and humidity_level < 30:
            message = f"A umidade do solo está baixa: {humidity_level}%. Por favor, regue as plantas."
            await send_push_notification(message)
            logger.info(f"Notificação enviada: {message}")
        else:
            logger.info(f"Nível de umidade está adequado: {humidity_level}%")
    except Exception as e:
        logger.error(f"Erro na função check_humidity_and_notify: {e}")


@app.get("/humidity")
async def get_humidity():
    humidity_data = await fetch_humidity()
    return {"humidity": humidity_data.get("humidity")}


scheduler = AsyncIOScheduler()
scheduler.add_job(check_humidity_and_notify, 'interval', minutes=5)
scheduler.start()


def run():
    import uvicorn
    logger.info("Iniciando o servidor FastAPI...")
    uvicorn.run(app, host="0.0.0.0", port=8000)

async def shutdown():
    logger.info("Parando o scheduler...")
    scheduler.shutdown(wait=True)
    logger.info("Scheduler parado.")
    logger.info("Fechando o loop de eventos...")
    loop.stop()
    logger.info("Loop de eventos fechado.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_in_executor(None, run)  
        loop.run_forever()  
    except KeyboardInterrupt:
        logger.info("Interrupção do usuário, encerrando o servidor.")
        asyncio.run(shutdown())
        
