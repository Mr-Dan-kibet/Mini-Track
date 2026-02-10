from flask_restful import Resource, request
from models import SchoolLocation, db
from flask_jwt_extended import jwt_required, get_jwt_identity
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

# create a new school location
class CreateSchoolLocation(Resource):
    @admin_required
    def post(self):
        data = request.get_json()
        name = data.get("name")
        route_id = data.get("route_id")
        gps_coordinates = data.get("gps_coordinates")

        if not name or not route_id:
            return {"error": "Name and route_id are required"}, 400

        new_location = SchoolLocation(
            name=name,
            route_id=route_id,
            gps_coordinates=gps_coordinates
        )

        db.session.add(new_location)
        db.session.commit()

        return {
            "message": "School location created successfully",
            "location": {
                "id": new_location.id,
                "name": new_location.name,
                "route_id": new_location.route_id,
                "gps_coordinates": new_location.gps_coordinates
            }
        }, 201
# get all school locations     
class GetAllSchoolLocations(Resource):
    @jwt_required()
    def get(self):
        locations = SchoolLocation.query.all()

        results = []
        for loc in locations:
            results.append({
                "id": loc.id,
                "route_id": loc.route_id,
                "name": loc.name,
                "gps_coordinates": loc.gps_coordinates
            })

        return results, 200
# get one school location by id
class GetSchoolLocation(Resource):
    @jwt_required()
    def get(self, location_id):
        location = SchoolLocation.query.get(location_id)

        if not location:
            return {"message": "School location not found"}, 404

        return {
            "id": location.id,
            "route_id": location.route_id,
            "name": location.name,
            "gps_coordinates": location.gps_coordinates
        }, 200

# update a school location by id
class UpdateSchoolLocation(Resource):
    @admin_required
    def put(self, location_id):
        location = SchoolLocation.query.get(location_id)

        if not location:
            return {"message": "School location not found"}, 404

        data = request.get_json()
        location.name = data.get("name", location.name)
        location.route_id = data.get("route_id", location.route_id)
        location.gps_coordinates = data.get("gps_coordinates", location.gps_coordinates)

        db.session.commit()

        return {
            "message": "School location updated successfully",
            "location": {
                "id": location.id,
                "name": location.name,
                "route_id": location.route_id,
                "gps_coordinates": location.gps_coordinates
            }
        }, 200
# delete a school location by id
class DeleteSchoolLocation(Resource):
    @admin_required
    def delete(self, location_id):
        location = SchoolLocation.query.get(location_id)

        if not location:
            return {"message": "School location not found"}, 404

        db.session.delete(location)
        db.session.commit()

        return {"message": "School location deleted successfully"}, 200

