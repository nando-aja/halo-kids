import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


RoleType = Literal[
    "masyarakat",
    "pengelola-panti",
    "admin",
]


class UserBase(BaseModel):
    nama: str = Field(min_length=2, max_length=100)
    email: EmailStr
    no_hp: str | None = Field(default=None, max_length=20)

    @field_validator("no_hp")
    @classmethod
    def validate_no_hp(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        cleaned = v.strip()
        if not re.match(r"^\+?[0-9]{8,18}$", cleaned):
            raise ValueError(
                "Nomor HP hanya boleh berisi angka dan diawali dengan tanda + (misal: +628123456789 atau 08123456789)."
            )
        return cleaned


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)
    role: RoleType | None = Field(default="masyarakat")
    peran: RoleType | None = Field(default=None)
    jenis_panti: str | None = Field(default=None, max_length=50)


class UserUpdate(BaseModel):
    nama: str | None = Field(default=None, min_length=2, max_length=100)
    no_hp: str | None = Field(default=None, max_length=20)

    @field_validator("no_hp")
    @classmethod
    def validate_no_hp(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        cleaned = v.strip()
        if not re.match(r"^\+?[0-9]{8,18}$", cleaned):
            raise ValueError(
                "Nomor HP hanya boleh berisi angka dan diawali dengan tanda + (misal: +628123456789 atau 08123456789)."
            )
        return cleaned


class UserRoleUpdate(BaseModel):
    peran: RoleType


class UserResponse(UserBase):
    id: int
    peran: RoleType
    tanggal_daftar: datetime

    model_config = ConfigDict(from_attributes=True)
