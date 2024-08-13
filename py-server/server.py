from fastapi import FastAPI, HTTPException
import httpx
from aiocache import caches, Cache
from aiocache.serializers import JsonSerializer
load_dotenv()


app = FastAPI()

caches.set_config({
    "default": {
        "cache": "aiocache.SimpleMemoryCache",
        "serializer": {"class": "aiocache.serializers.JsonSerializer"},
        "ttl": 60,
    }
})

EXTERNAL_API_URL = os.getenv("EXTERNAL_API_URL")

async def fetch_humidity():
    cache = caches.get("default")
    cached_humidity = await cache.get("humidity_data")

    if cached_humidity:
        return cached_humidity

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(EXTERNAL_API_URL)
            response.raise_for_status()
            humidity_data = response.json()
            await cache.set("humidity_data", humidity_data)
            return humidity_data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Erro ao obter os dados da API externa")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Serviço indisponível")

@app.get("/")
async def get_humidity():
    humidity_data = await fetch_humidity()
    return {"humidity": humidity_data.get("humidity")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
