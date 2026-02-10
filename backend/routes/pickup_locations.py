from flask import request
from flask_restful import Resource
from models import db, PickupLocation, Route
from sqlalchemy.exc import IntegrityError
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

class PickupLocationList(Resource):
    """Handle GET all and POST for pickup locations"""
    @jwt_required()
    def get(self):
        """
        Get all pickup locations
        Optional query params:
        - route_id: filter by route
        """
        try:
            route_id = request.args.get('route_id', type=int)
            
            if route_id:
                pickup_locations = PickupLocation.query.filter_by(route_id=route_id).all()
            else:
                pickup_locations = PickupLocation.query.all()
            
            return {
                'pickup_locations': [
                    {
                        'id': location.id,
                        'route_id': location.route_id,
                        'route_name': location.route.name,
                        'name': location.name,
                        'gps_coordinates': location.gps_coordinates
                    }
                    for location in pickup_locations
                ]
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500
    @admin_required
    def post(self):
        """
        Create a new pickup location
        Expected JSON:
        {
            "route_id": 1,
            "name": "Main Street Stop",
            "gps_coordinates": "-1.2921,36.8219"
        }
        """
        try:
            data = request.get_json()
            
            # Validate required fields
            required_fields = ['route_id', 'name', 'gps_coordinates']
            for field in required_fields:
                if field not in data:
                    return {'error': f'Missing required field: {field}'}, 400
            
            # Verify route exists
            route = Route.query.get(data['route_id'])
            if not route:
                return {'error': 'Route not found'}, 404
            
            # Create new pickup location
            pickup_location = PickupLocation(
                route_id=data['route_id'],
                name=data['name'],
                gps_coordinates=data['gps_coordinates']
            )
            
            db.session.add(pickup_location)
            db.session.commit()
            
            return {
                'message': 'Pickup location created successfully',
                'pickup_location': {
                    'id': pickup_location.id,
                    'route_id': pickup_location.route_id,
                    'name': pickup_location.name,
                    'gps_coordinates': pickup_location.gps_coordinates
                }
            }, 201
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Database integrity error'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class PickupLocationDetail(Resource):
    """Handle GET, PUT, PATCH, DELETE for a specific pickup location"""
    @jwt_required()
    def get(self, id):
        """Get a specific pickup location by ID"""
        try:
            pickup_location = PickupLocation.query.get(id)
            
            if not pickup_location:
                return {'error': 'Pickup location not found'}, 404
            
            return {
                'pickup_location': {
                    'id': pickup_location.id,
                    'route_id': pickup_location.route_id,
                    'route_name': pickup_location.route.name,
                    'name': pickup_location.name,
                    'gps_coordinates': pickup_location.gps_coordinates,
                    'bookings_count': len(pickup_location.bookings)
                }
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500
    @admin_required
    def put(self, id):
        """Update a pickup location (full update)"""
        return self._update(id)
    @admin_required
    def patch(self, id):
        """Update a pickup location (partial update)"""
        return self._update(id)
    @admin_required
    def _update(self, id):
        """
        Update a pickup location
        Expected JSON (all fields optional):
        {
            "name": "Updated Name",
            "gps_coordinates": "-1.2921,36.8219",
            "route_id": 2
        }
        """
        try:
            pickup_location = PickupLocation.query.get(id)
            
            if not pickup_location:
                return {'error': 'Pickup location not found'}, 404
            
            data = request.get_json()
            
            # Update route_id if provided
            if 'route_id' in data:
                route = Route.query.get(data['route_id'])
                if not route:
                    return {'error': 'Route not found'}, 404
                pickup_location.route_id = data['route_id']
            
            # Update name if provided
            if 'name' in data:
                pickup_location.name = data['name']
            
            # Update GPS coordinates if provided
            if 'gps_coordinates' in data:
                pickup_location.gps_coordinates = data['gps_coordinates']
            
            db.session.commit()
            
            return {
                'message': 'Pickup location updated successfully',
                'pickup_location': {
                    'id': pickup_location.id,
                    'route_id': pickup_location.route_id,
                    'name': pickup_location.name,
                    'gps_coordinates': pickup_location.gps_coordinates
                }
            }, 200
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Database integrity error'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500
    @admin_required
    def delete(self, id):
        """
        Delete a pickup location
        Note: This will fail if there are active bookings using this location
        """
        try:
            pickup_location = PickupLocation.query.get(id)
            
            if not pickup_location:
                return {'error': 'Pickup location not found'}, 404
            
            # Check if location has active bookings
            if pickup_location.bookings:
                return {
                    'error': 'Cannot delete pickup location with active bookings',
                    'active_bookings': len(pickup_location.bookings)
                }, 400
            
            db.session.delete(pickup_location)
            db.session.commit()
            
            return {'message': 'Pickup location deleted successfully'}, 200
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Cannot delete location due to existing references'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500


class PickupLocationByRoute(Resource):
    """Get all pickup locations for a specific route"""
    @jwt_required()
    def get(self, route_id):
        """Get all pickup locations for a specific route"""
        try:
            # Verify route exists
            route = Route.query.get(route_id)
            if not route:
                return {'error': 'Route not found'}, 404
            
            pickup_locations = PickupLocation.query.filter_by(route_id=route_id).all()
            
            return {
                'route': {
                    'id': route.id,
                    'name': route.name
                },
                'pickup_locations': [
                    {
                        'id': location.id,
                        'name': location.name,
                        'gps_coordinates': location.gps_coordinates
                    }
                    for location in pickup_locations
                ]
            }, 200
            
        except Exception as e:
            return {'error': str(e)}, 500


class PickupLocationBulk(Resource):
    """Bulk create pickup locations"""
    @admin_required
    def post(self):
        """
        Create multiple pickup locations at once
        Expected JSON:
        {
            "route_id": 1,
            "locations": [
                {
                    "name": "Stop 1",
                    "gps_coordinates": "-1.2921,36.8219"
                },
                {
                    "name": "Stop 2",
                    "gps_coordinates": "-1.2931,36.8229"
                }
            ]
        }
        """
        try:
            data = request.get_json()
            
            if 'route_id' not in data or 'locations' not in data:
                return {'error': 'Missing route_id or locations'}, 400
            
            # Verify route exists
            route = Route.query.get(data['route_id'])
            if not route:
                return {'error': 'Route not found'}, 404
            
            created_locations = []
            
            for location_data in data['locations']:
                if 'name' not in location_data or 'gps_coordinates' not in location_data:
                    continue
                
                pickup_location = PickupLocation(
                    route_id=data['route_id'],
                    name=location_data['name'],
                    gps_coordinates=location_data['gps_coordinates']
                )
                
                db.session.add(pickup_location)
                created_locations.append(pickup_location)
            
            db.session.commit()
            
            return {
                'message': f'{len(created_locations)} pickup locations created successfully',
                'pickup_locations': [
                    {
                        'id': location.id,
                        'name': location.name,
                        'gps_coordinates': location.gps_coordinates
                    }
                    for location in created_locations
                ]
            }, 201
            
        except IntegrityError:
            db.session.rollback()
            return {'error': 'Database integrity error'}, 400
        except Exception as e:
            db.session.rollback()
            return {'error': str(e)}, 500