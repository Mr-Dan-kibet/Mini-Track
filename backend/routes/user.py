from flask import Flask, request, session
from flask_restful import Resource
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, User, UserRole
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from functools import wraps

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()

        if identity.get("role_id") != 1:
            return {"error": "Admins only"}, 403

        return fn(*args, **kwargs)
    return wrapper


class CreateDriver(Resource):
    @admin_required
    def post(self):
        data = request.get_json()
        # admin_id = session.get("user_id")

        # admin = User.query.get(admin_id)
        # if not admin or admin.role_id != 1:  
        #     return {"error": "Unauthorized"}, 403

        name = data.get("name")
        email = data.get("email")
        password = data.get("password") # the driver will later change this
        phone_number = data.get("phone_number")

        if not name or not email or not password:
            return {"error": "All fields required"}, 400

        if User.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 400

        hashed_password = generate_password_hash(password)

        new_driver = User(
            name=name,
            email=email,
            password_hash=hashed_password,
            phone_number=phone_number,
            role_id=2
        )

        db.session.add(new_driver)
        db.session.commit()

        return {
            "message": "Driver created successfully",
            "user": {
                "id": new_driver.id,
                "name": new_driver.name,
                "email": new_driver.email,
                "role_id": new_driver.role_id
            }
        }, 201
        
class GetDrivers(Resource):
    @admin_required
    def get(self):
        # admin = User.query.get(session.get("user_id"))
        # if not admin or admin.role_id != 1:
        #     return {"error": "Unauthorized"}, 403

        drivers = User.query.filter_by(role_id=2).all()

        results = []
        for d in drivers:
            results.append({
                "id": d.id,
                "name": d.name,
                "email": d.email,
                "phone_number": d.phone_number
            })

        return results

class GetUsers(Resource):
    @admin_required
    def get(self):
        admin = User.query.get(session.get("user_id"))
        if not admin or admin.role_id != 1:
            return {"error": "Unauthorized"}, 403

        users = User.query.all()

        return [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role_id": u.role_id
            } for u in users
        ]

class GetUser(Resource):
    def get(self, id):
        user = User.query.get(id)
        if not user:
            return {"error": "User not found"}, 404

        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role_id": user.role_id
        }

class UpdateUser(Resource):
    def put(self, user_id):
        # current_user_id = session.get("user_id")
        # if current_user_id != id:
        #     return {"error": "Not logged in"}, 403
        data = request.get_json()
        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404
        
        user.name = data.get("name", user.name)
        user.email = data.get("email", user.email)
        user.phone_number = data.get("phone_number", user.phone_number)

        db.session.commit()

        return {
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone_number": user.phone_number,
                "role_id": user.role_id
            }
        }
        
class DeleteUser(Resource):
    @admin_required
    def delete(self, user_id):
        # admin = User.query.get(session.get("user_id"))
        # if not admin or admin.role_id != 1:
        #     return {"error": "Unauthorized"}, 403

        user = User.query.get(user_id)
        if not user:
            return {"error": "User not found"}, 404

        db.session.delete(user)
        db.session.commit()

        return {"message": "User deleted"}

# route for creating admin users
class CreateAdmin(Resource):
    def post(self):
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        phone_number = data.get("phone_number")

        if not name or not email or not password:
            return {"error": "All fields required"}, 400

        if User.query.filter_by(email=email).first():
            return {"error": "Email already exists"}, 400

        hashed_password = generate_password_hash(password)

        new_admin = User(
            name=name,
            email=email,
            password_hash=hashed_password,
            phone_number=phone_number,
            role_id=1
        )

        db.session.add(new_admin)
        db.session.commit()

        return {
            "message": "Admin created successfully",
            "user": {
                "id": new_admin.id,
                "name": new_admin.name,
                "email": new_admin.email,
                "role_id": new_admin.role_id
            }
        }, 201