from pydantic import BaseModel


class LoginData(BaseModel):
    username: str


class VerifyData(BaseModel):
    user_id: str
