from fastapi import APIRouter, HTTPException
import qrcode
from io import BytesIO
import base64

from base import db
from utils.qr import generate_qr_code

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/generate-qr-codes/{cafe_id}")
async def generate_qr_codes(cafe_id: str):
    cafe = await db.cafes.find_one({"id": cafe_id}, {"_id": 0})
    if not cafe:
        raise HTTPException(status_code=404, detail="Cafe not found")
    
    table_count = cafe["table_count"]
    frontend_url = cafe.get("qr_base_url", "https://helmisa.app/qr/")
    
    qr_codes = []
    for table_num in range(1, table_count + 1):
        qr_url = f"{frontend_url}{cafe_id}/{table_num}"
        qr_image_base64 = generate_qr_code(qr_url)
        
        qr_codes.append({
            "table_number": table_num,
            "qr_url": qr_url,
            "qr_image": qr_image_base64,
            "download_name": f"helMisa_Masa_{table_num}.png"
        })
    
    return {"cafe": cafe, "qr_codes": qr_codes, "total": len(qr_codes)}
