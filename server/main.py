from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.lifespan import lifespan
from api.routes import transactions, categories, export_csv, load_csv, profiles

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
    # Without this, CORS hides the header and the export can't read the filename
    expose_headers=["Content-Disposition"],
)

app.include_router(profiles.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(load_csv.router)
app.include_router(export_csv.router)


@app.get("/")
async def root():
    return {
        "message": "RBC Transaction API",
        "endpoints": {
            "/profiles": "List, create, rename and delete transaction profiles",
            "/transactions": "Get paginated transactions by profile and category",
            "/categories": "List all categories with counts and totals",
            "/transactions/export": "Download the filtered transactions as a CSV",
            "/load-csv": "Load a CSV file from a server-side path into a profile",
            "/upload-csv": "Upload a CSV file from the browser into a profile",
            "/export-csv": "Export the selected profile's transactions into a CSV file"
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
