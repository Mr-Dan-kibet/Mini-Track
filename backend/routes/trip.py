"""
Trip Routes and Resources
Handles driver daily operations and trip status management
"""

from flask import request
from flask_restful import Resource
from datetime import datetime, date
from models import db, Trip, Booking
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps

# ========================
# HELPER FUNCTIONS
# ========================

# def serialize_trip(trip):
#     """
#     Serialize trip with booking details for driver view
#     """
#     return {
#         "trip_id": trip.id,
#         "booking_id": trip.booking_id,
#         "trip_date": trip.trip_date.isoformat(),
#         "service_time": trip.service_time,
#         "status": trip.status,
#         "pickup_time": trip.pickup_time.isoformat() if trip.pickup_time else None,
#         "actual_pickup_time": trip.actual_pickup_time.isoformat() if trip.actual_pickup_time else None,
#         "actual_dropoff_time": trip.actual_dropoff_time.isoformat() if trip.actual_dropoff_time else None,
#         "driver_notes": trip.driver_notes,
#         # Include booking details for driver
#         "child_name": trip.booking.user.name,
#         "pickup_location": trip.booking.pickup_location,
#         "dropoff_location": trip.booking.dropoff_location,
#         "seats_booked": trip.booking.seats_booked,
#     }

def driver_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()

        if identity.get("role_id") != 2:
            return {"error": "Drivers only"}, 403

        return fn(*args, **kwargs)
    return wrapper

def serialize_trip(trip):
    """
    Serialize trip with booking details for driver view
    """
    booking = trip.booking

    return {
        "trip_id": trip.id,
        "booking_id": trip.booking_id,
        "trip_date": trip.trip_date.isoformat(),
        "service_time": trip.service_time,
        "status": trip.status,
        "pickup_time": trip.pickup_time.isoformat() if trip.pickup_time else None,
        "actual_pickup_time": trip.actual_pickup_time.isoformat() if trip.actual_pickup_time else None,
        "actual_dropoff_time": trip.actual_dropoff_time.isoformat() if trip.actual_dropoff_time else None,
        "driver_notes": trip.driver_notes,

        # booking details for driver (safe)
        "child_name": booking.user.name if booking and booking.user else None,
        "seats_booked": booking.seats_booked if booking else 0,

        # ✅ IMPORTANT: return JSON-safe values, not model objects
        "pickup_location": booking.pickup_location.name if booking and booking.pickup_location else None,
        "dropoff_location": booking.dropoff_location.name if booking and booking.dropoff_location else None,

        # (optional but useful)
        "pickup_location_id": booking.pickup_location_id if booking else None,
        "dropoff_location_id": booking.dropoff_location_id if booking else None,
    }


# ========================
# RESOURCE CLASSES
# ========================

class TripToday(Resource):
    """
    Get today's trips for a specific vehicle and service time
    Critical for driver daily checklist
    """
    @jwt_required()
    def get(self):
        """
        Get today's trips
        
        Query params (required):
            - vehicle_id: Which vehicle's trips to show
            - service_time: 'morning' or 'evening'
        
        Example: GET /trips/today?vehicle_id=5&service_time=morning
        """
        # Get required parameters
        vehicle_id = request.args.get('vehicle_id', type=int)
        service_time = request.args.get('service_time')
        
        # Validate required params
        if not vehicle_id:
            return {"error": "vehicle_id is required"}, 400
        
        if not service_time:
            return {"error": "service_time is required"}, 400
        
        if service_time not in ['morning', 'evening']:
            return {"error": "service_time must be 'morning' or 'evening'"}, 400
        
        # Query today's trips for this vehicle and service time
        today = date.today()
        
        # Get vehicle to find its route
        from models import Vehicle
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return {"error": "Vehicle not found"}, 404
        
        trips = Trip.query.join(Booking).filter(
            Trip.trip_date == today,
            Trip.service_time == service_time,
            Booking.route_id == vehicle.route_id,  # Changed from vehicle_id to route_id
            Trip.status.in_(['scheduled', 'picked_up'])  # Don't show cancelled/completed
        ).all()
        
        # Serialize trips
        response = {
            "date": today.isoformat(),
            "service_time": service_time,
            "vehicle_id": vehicle_id,
            "trips": [serialize_trip(trip) for trip in trips],
            "total_expected": len(trips),
            "total_picked_up": len([t for t in trips if t.status == 'picked_up']),
            "total_pending": len([t for t in trips if t.status == 'scheduled'])
        }
        
        return response, 200


class TripPickup(Resource):
    """
    Mark trip as picked up (shortcut endpoint for drivers)
    """
    @driver_required
    def patch(self, trip_id):
        """
        Mark child as picked up
        
        Optional JSON body:
        {
            "driver_notes": "optional notes"
        }
        """
        trip = Trip.query.get(trip_id)
        
        if not trip:
            return {"error": "Trip not found"}, 404
        
        if trip.status == 'completed':
            return {"error": "Trip is already completed"}, 409
        
        if trip.status == 'cancelled':
            return {"error": "Cannot pickup a cancelled trip"}, 409
        
        # Mark as picked up
        trip.status = 'picked_up'
        trip.actual_pickup_time = datetime.utcnow()
        
        # Add driver notes if provided
        data = request.get_json()
        if data and 'driver_notes' in data:
            trip.driver_notes = data['driver_notes']
        
        db.session.commit()
        
        response = serialize_trip(trip)
        response["message"] = "Child marked as picked up"
        
        return response, 200


class TripDropoff(Resource):
    """
    Mark trip as completed/dropped off (shortcut endpoint for drivers)
    """
    @driver_required
    def patch(self, trip_id):
        """
        Mark child as dropped off
        
        Optional JSON body:
        {
            "driver_notes": "optional notes"
        }
        """
        trip = Trip.query.get(trip_id)
        
        if not trip:
            return {"error": "Trip not found"}, 404
        
        if trip.status == 'completed':
            return {"error": "Trip is already completed"}, 409
        
        if trip.status == 'cancelled':
            return {"error": "Cannot complete a cancelled trip"}, 409
        
        # Mark as completed
        trip.status = 'completed'
        trip.actual_dropoff_time = datetime.utcnow()
        
        # Set pickup time if not already set
        if not trip.actual_pickup_time:
            trip.actual_pickup_time = datetime.utcnow()
        
        # Add driver notes if provided
        data = request.get_json()
        if data and 'driver_notes' in data:
            trip.driver_notes = data['driver_notes']
        
        db.session.commit()
        
        response = serialize_trip(trip)
        response["message"] = "Child marked as dropped off"
        
        return response, 200