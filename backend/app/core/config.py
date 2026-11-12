from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "HaloKids Backend"

    # Database utama HaloKids
    DATABASE_URL: str

    # JWT / Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    FRONTEND_ORIGINS: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_JWKS_URL: str = ""

    SUPABASE_PRIVATE_BUCKET: str = "halokids-private"
    SUPABASE_PUBLIC_BUCKET: str = "halokids-public"

    # Koneksi database (hanya dipakai untuk MySQL/TiDB).
    # TiDB Cloud menutup koneksi yang menganggur, jadi koneksi di pool
    # harus dicek/didaur ulang sebelum dipakai agar request pertama
    # setelah idle tidak menggantung puluhan detik.
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 15
    DB_POOL_RECYCLE: int = 240
    DB_CONNECT_TIMEOUT: int = 10
    DB_READ_TIMEOUT: int = 25
    DB_WRITE_TIMEOUT: int = 25

    # Request yang lebih lambat dari ini (ms) dicatat di log sebagai SLOW.
    SLOW_REQUEST_MS: int = 1500

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.FRONTEND_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()