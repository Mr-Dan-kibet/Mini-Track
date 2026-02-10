from flask import request
from flask_restful import Resource
from models import db, Route
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps

# ========================
# HELPER FUNCTIONS
# ========================

def admin_required(fn):
    """Decorator to require admin role"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()

        if identity.get("role_id") != 1:
            return {"error": "Admins only"}, 403

        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()

        if identity.get("role_id") != 1:
            return {"error": "Admins only"}, 403

        return fn(*args, **kwargs)
    return wrapper

def serialize_route(route):
    """
    Serialize route with geofence data
    """
    return {
        "id": route.id,
        "name": route.name,
        "starting_point": route.starting_point,
        "ending_point": route.ending_point,
        # ✅ NEW: Geofence fields
        "starting_point_gps": route.starting_point_gps,
        "ending_point_gps": route.ending_point_gps,
        "route_radius_km": route.route_radius_km or 5.0,
    }


class RouteList(Resource):
<<<<<<< HEAD
    """Get all routes or create new route"""

=======
>>>>>>> dev
    @jwt_required()
    def get(self):
        """Get all routes"""
        routes = Route.query.all()
        
        response = []
        for route in routes:
            response.append(serialize_route(route))
        
        return response, 200
    
    @admin_required
    def post(self):
        """
        Create new route
        
        Expected JSON:
        {
            "name": "Thika Road",
            "starting_point": "CBD",
            "ending_point": "Thika",
            "starting_point_gps": "-1.2921,36.8219",  // OPTIONAL
            "ending_point_gps": "-1.0500,37.0833",    // OPTIONAL
            "route_radius_km": 5.0                     // OPTIONAL (default 5.0)
        }
        """
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'starting_point', 'ending_point']
        
        for field in required_fields:
            if field not in data:
                return {"error": f"{field} is required"}, 400
        
        # Check if route name already exists
        existing_route = Route.query.filter_by(name=data['name']).first()
        if existing_route:
            return {"error": "Route with this name already exists"}, 409
        
        # Create route with geofence data
        route = Route(
            name=data['name'],
            starting_point=data['starting_point'],
            ending_point=data['ending_point'],
            # ✅ NEW: Optional geofence fields
            starting_point_gps=data.get('starting_point_gps'),
            ending_point_gps=data.get('ending_point_gps'),
            route_radius_km=data.get('route_radius_km', 5.0)
        )
        
        db.session.add(route)
        db.session.commit()
        
        response = serialize_route(route)
        response["message"] = "Route created successfully"
        
        return response, 201


class RouteDetail(Resource):
<<<<<<< HEAD
    """Handle single route operations"""

=======
    # Handle single route operations
>>>>>>> dev
    @jwt_required()
    def get(self, route_id):
        """Get single route by ID"""
        route = Route.query.get(route_id)
        
        if not route:
            return {"error": "Route not found"}, 404
        
        response = serialize_route(route)
        return response, 200
    
    @admin_required
    def patch(self, route_id):
        """
        Update route
        
        JSON body (all fields optional):
        {
            "name": "Updated Name",
            "starting_point": "New Start",
            "ending_point": "New End",
            "starting_point_gps": "-1.2921,36.8219",
            "ending_point_gps": "-1.0500,37.0833",
            "route_radius_km": 7.5
        }
        """
        route = Route.query.get(route_id)
        
        if not route:
            return {"error": "Route not found"}, 404
        
        data = request.get_json()
        
        if not data:
            return {"error": "No data provided"}, 400
        
        # Update name if provided
        if 'name' in data:
            # Check if new name already exists (but not for this route)
            existing = Route.query.filter(
                Route.name == data['name'],
                Route.id != route_id
            ).first()
            if existing:
                return {"error": "Route with this name already exists"}, 409
            route.name = data['name']
        
        # Update starting_point if provided
        if 'starting_point' in data:
            route.starting_point = data['starting_point']
        
        # Update ending_point if provided
        if 'ending_point' in data:
            route.ending_point = data['ending_point']
        
        # ✅ NEW: Update geofence fields if provided
        if 'starting_point_gps' in data:
            route.starting_point_gps = data['starting_point_gps']
        
        if 'ending_point_gps' in data:
            route.ending_point_gps = data['ending_point_gps']
        
        if 'route_radius_km' in data:
            # Validate radius is positive
            radius = float(data['route_radius_km'])
            if radius <= 0:
                return {"error": "route_radius_km must be positive"}, 400
            route.route_radius_km = radius
        
        db.session.commit()
        
        response = serialize_route(route)
        response["message"] = "Route updated successfully"
        
        return response, 200
<<<<<<< HEAD
    
=======
>>>>>>> dev
    @admin_required
    def delete(self, route_id):
        """Delete route"""
        route = Route.query.get(route_id)
        
        if not route:
            return {"error": "Route not found"}, 404
        
        # Check if route has vehicles assigned
        from models import Vehicle
        vehicles_count = Vehicle.query.filter_by(route_id=route_id).count()
        
        if vehicles_count > 0:
            return {
                "error": f"Cannot delete route. It has {vehicles_count} vehicle(s) assigned"
            }, 409
        
        # Check if route has school locations
        from models import SchoolLocation
        school_locations_count = SchoolLocation.query.filter_by(route_id=route_id).count()
        
        if school_locations_count > 0:
            return {
                "error": f"Cannot delete route. It has {school_locations_count} school location(s)"
            }, 409
        
        db.session.delete(route)
        db.session.commit()
        
        return {"message": "Route deleted successfully"}, 200