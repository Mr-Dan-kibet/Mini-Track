from flask import Flask, request, session, make_response
from flask_restful import Resource
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, verify_jwt_in_request, unset_jwt_cookies, set_access_cookies
from werkzeug.security import check_password_hash, generate_password_hash

from models import db, User, UserRole

class Login(Resource):
    def post(self):
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        role_id = data.get("role_id")

        user = User.query.filter_by(email=email).first()

        if user and check_password_hash(user.password_hash, password):
            # session["user_id"] = user.id
            access_token = create_access_token(identity={"id": user.id, "role_id": user.role_id})
            response = make_response({
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "role_id": user.role_id,
                    "role": user.role.name
                }
            }, 200)
            set_access_cookies(response, access_token)


            return response
        else:
            return {"message": "Invalid credentials"}, 401


class Signup(Resource):
    def post(self):
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        phone_number = data.get("phone_number")
        residence = data.get("residence")
        password = data.get("password")

        if not name or not email or not password:
            return {"error": "All fields required"}, 400

        if User.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 400

        hashed_password = generate_password_hash(password)
        
        new_user = User(
            name=name,
            email=email,
            phone_number=phone_number,
            residence=residence,
            password_hash=hashed_password,
            role_id= 3 # default to parent role
        )
        db.session.add(new_user)
        db.session.commit()

        return{
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "role_id": new_user.role_id
            }
        }, 201
    
class Logout(Resource):
    def post(self):
        # session.pop("user_id", None)
        response = make_response({"message": "Logged out"}, 200)
        unset_jwt_cookies(response)
        return response
    
class Me(Resource):
    @jwt_required()
    def get(self):
        identity = get_jwt_identity()
        user = User.query.get(identity["id"])

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.name
        }