from fastapi import APIRouter, HTTPException
from typing import List
import qrcode
from io import BytesIO
import base64

from server import db
from utils.qr import generate_qr_code

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/generate-qr-codes/{cafe_id}")
async def generate_qr_codes(cafe_id: str):
    """
    Cafe için tüm masa QR kodlarını oluştur
    """
    # Cafe'yi bul
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    table_count = cafe["table_count"]
    frontend_url = cafe.get("qr_base_url", "https://cekin2-app.preview.emergentagent.com/qr/")
    
    qr_codes = []
    
    for table_num in range(1, table_count + 1):
        # QR data format: helmisa-{cafe_id}-table-{table_num}
        qr_data = f"helmisa-{cafe_id}-table-{table_num}"
        qr_url = f"{frontend_url}{cafe_id}/{table_num}"
        
        # QR kod oluştur
        qr_image_base64 = generate_qr_code(qr_url)
        
        qr_codes.append({
            "table_number": table_num,
            "qr_data": qr_data,
            "qr_url": qr_url,
            "qr_image": qr_image_base64,
            "download_name": f"helMisa_Masa_{table_num}.png"
        })
    
    return {
        "cafe": cafe,
        "qr_codes": qr_codes,
        "total": len(qr_codes)
    }

@router.get("/qr-preview/{cafe_id}/{table_number}")
async def qr_preview(cafe_id: str, table_number: int):
    """
    Tek bir QR kod önizlemesi
    """
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    if table_number < 1 or table_number > cafe["table_count"]:
        raise HTTPException(status_code=400, detail="Invalid table number")
    
    frontend_url = cafe.get("qr_base_url", "https://cekin2-app.preview.emergentagent.com/qr/")
    qr_url = f"{frontend_url}{cafe_id}/{table_number}"
    qr_image_base64 = generate_qr_code(qr_url)
    
    return {
        "cafe_name": cafe["name"],
        "table_number": table_number,
        "qr_url": qr_url,
        "qr_image": qr_image_base64
    }
