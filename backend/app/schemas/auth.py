from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    phone: str
    password: str
    email: Optional[EmailStr] = None
    
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

class WebVerify2FA(BaseModel):
    token_2fa: str
    code: str

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ResendCodeRequest(BaseModel):
    phone: str