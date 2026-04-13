from datetime import datetime
import math

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    İki nokta arasındaki mesafeyi metre cinsinden hesaplar (Haversine formülü)
    """
    R = 6371000  # Yer yarıçapı (metre)
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance

def is_within_range(lat1: float, lng1: float, lat2: float, lng2: float, max_distance: float = 60) -> bool:
    """
    İki noktanın belirtilen mesafe içinde olup olmadığını kontrol eder
    Varsayılan: 60 metre
    """
    distance = calculate_distance(lat1, lng1, lat2, lng2)
    return distance <= max_distance

def is_expired(expires_at: datetime) -> bool:
    """
    Bir öğenin süresi dolmuş mu kontrol eder
    """
    return datetime.utcnow() > expires_at
