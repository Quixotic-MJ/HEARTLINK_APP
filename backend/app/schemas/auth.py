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
    email: str
    password: str