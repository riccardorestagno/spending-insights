from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.lifespan import lifespan
from api.routes import transactions, categories, load_csv

app = FastAPI(
    title="RBC Transaction API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(load_csv.router)


@app.get("/")
async def root():
    return {
        "message": "RBC Transaction API",
        "endpoints": {
            "/transactions": "Get paginated transactions by category",
            "/categories": "List all categories with counts and totals",
            "/load-csv": "Load a CSV file into the database"
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
