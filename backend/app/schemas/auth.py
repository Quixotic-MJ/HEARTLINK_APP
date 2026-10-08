from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.utils.password_policy import validate_strong_password

class RegisterRequest(BaseModel):
    phone: str
    password: str
    email: Optional[EmailStr] = None
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_strong_password(v)
    
class UserResponsePayload(BaseModel):
    id: str
    phone: str
    email: Optional[EmailStr] = None
    
class AuthResponse(BaseModel):
    message:str
    user: Optional[UserResponsePayload] = None
    
class CodeResponse(BaseModel):
    code: str
    phone: str
    
class Login(BaseModel):
    identifier: str
    password: str
    remember: Optional[bool] = False

class WebVerify2FA(BaseModel):
    token_2fa: str
    code: str
    remember: Optional[bool] = False

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ResendCodeRequest(BaseModel):
    phone: str