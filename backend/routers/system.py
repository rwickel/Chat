# backend/routers/system.py
import os
import platform
import psutil
import torch
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any


router = APIRouter(prefix="/system", tags=["system"])
