import random
import string
from datetime import datetime, date
from api.core.config import settings


def generate_random_string(length: int) -> str:
    # Definisikan karakter yang akan digunakan untuk pembuatan string acak
    # huruf besar, huruf kecil, dan angka
    characters = string.ascii_uppercase + string.digits

    # Gunakan random.choices() untuk memilih karakter secara acak dari daftar karakter dengan pengulangan sebanyak length
    random_string = ''.join(random.choices(characters, k=length))

    return random_string
