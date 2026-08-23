from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    name = request.data.get('name') or request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')

    if not name or not email or not password:
        return Response(
            {"detail": "Name, email, and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if confirm_password is not None and password != confirm_password:
        return Response(
            {"detail": "Passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 8:
        return Response(
            {"detail": "Password must be at least 8 characters long."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate email unique
    if User.objects.filter(email=email).exists():
        return Response(
            {"detail": "A user with this email address already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Resolve unique username
    base_username = email.split('@')[0].lower()
    import re
    base_username = re.sub(r'[^a-zA-Z0-9]', '', base_username)
    if not base_username:
        base_username = "user"
        
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    # Create user
    user = User.objects.create_user(username=username, email=email, password=password, first_name=name)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token": token.key,
        "user": UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username_or_email = request.data.get('username')
    password = request.data.get('password')

    if not username_or_email or not password:
        return Response(
            {"detail": "Username/email and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_obj = None
    if "@" in username_or_email:
        user_obj = User.objects.filter(email=username_or_email).first()
    if not user_obj:
        user_obj = User.objects.filter(username=username_or_email).first()
        
    if user_obj:
        user = authenticate(username=user_obj.username, password=password)
    else:
        user = authenticate(username=username_or_email, password=password)

    if not user:
        return Response(
            {"detail": "Invalid credentials. Please check your username/email and password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token": token.key,
        "user": UserSerializer(user).data
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_me(request):
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
