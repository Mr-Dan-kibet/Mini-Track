from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()


class UserRole(db.Model):
    __tablename__ = 'user_roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    # Relationships
    users = db.relationship(
        'User',
        back_populates='role',
        cascade='all, delete-orphan'
    )


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True)
    residence = db.Column(db.String(200))
    password_hash = db.Column(db.String(128), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('user_roles.id'), nullable=False)

    # Relationships
    role = db.relationship('UserRole', back_populates='users')
    vehicles = db.relationship(
        'Vehicle',
        back_populates='user',
        cascade='all, delete-orphan'
    )
    bookings = db.relationship(
        'Booking',
        back_populates='user',
        cascade='all, delete-orphan'
    )
# ADD THESE COLUMNS TO YOUR Route MODEL IN models.py
# 
# Find the Route class and add these three new columns:

class Route(db.Model):
    __tablename__ = 'routes'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    starting_point = db.Column(db.String(200), nullable=False)
    ending_point = db.Column(db.String(200), nullable=False)
    
    # ✅ ADD THESE THREE NEW COLUMNS
    starting_point_gps = db.Column(db.String(50))  # e.g., "-1.2921,36.8219"
    ending_point_gps = db.Column(db.String(50))    # e.g., "-1.2500,36.7500"
    route_radius_km = db.Column(db.Float, default=5.0)  # Default 5km radius corridor

    # Relationships (keep existing ones)
    vehicles = db.relationship(
        'Vehicle',
        back_populates='route',
        cascade='all, delete-orphan'
    )
    bookings = db.relationship(
        'Booking',
        back_populates='route',
        cascade='all, delete-orphan'
    )
    school_locations = db.relationship(
        'SchoolLocation',
        back_populates='route',
        cascade='all, delete-orphan'
    )
    pickup_locations = db.relationship(
        'PickupLocation',
        back_populates='route',
        cascade='all, delete-orphan'
    )


class SchoolLocation(db.Model):
    __tablename__ = 'school_locations'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gps_coordinates = db.Column(db.String(50), nullable=False)

    # Relationships
    route = db.relationship('Route', back_populates='school_locations')
    # Don't cascade delete bookings when location is deleted
    # This allows you to handle it differently (e.g., cancel bookings or reassign)
    bookings = db.relationship(
        'Booking',
        back_populates='dropoff_location',
        foreign_keys='Booking.dropoff_location_id'
    )


class PickupLocation(db.Model):
    __tablename__ = 'pickup_locations'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    gps_coordinates = db.Column(db.String(50), nullable=False)

    # Relationships
    route = db.relationship('Route', back_populates='pickup_locations')
    # Don't cascade delete bookings when location is deleted
    bookings = db.relationship(
        'Booking',
        back_populates='pickup_location',
        foreign_keys='Booking.pickup_location_id'
    )


class Vehicle(db.Model):
    __tablename__ = 'vehicles'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    model = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='vehicles')
    route = db.relationship('Route', back_populates='vehicles')


class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    booking_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    pickup_location_id = db.Column(
        db.Integer,
        db.ForeignKey('pickup_locations.id'),
        nullable=False
    )
    dropoff_location_id = db.Column(
        db.Integer,
        db.ForeignKey('school_locations.id'),
        nullable=False
    )

    status = db.Column(db.String(50), nullable=False)
    seats_booked = db.Column(db.Integer, nullable=False, default=1)
    service_type = db.Column(db.String(50), nullable=False)
    days_of_week = db.Column(db.String(100), nullable=False)

    # Relationships
    user = db.relationship('User', back_populates='bookings')
    route = db.relationship('Route', back_populates='bookings')
    pickup_location = db.relationship(
        'PickupLocation',
        back_populates='bookings',
        foreign_keys=[pickup_location_id]
    )
    dropoff_location = db.relationship(
        'SchoolLocation',
        back_populates='bookings',
        foreign_keys=[dropoff_location_id]
    )
    trips = db.relationship(
        'Trip',
        back_populates='booking',
        cascade='all, delete-orphan'
    )


class Trip(db.Model):
    __tablename__ = 'trips'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)

    service_time = db.Column(db.String(20), nullable=False)  # e.g., "morning" or "afternoon"
    status = db.Column(db.String(50), nullable=False)
    trip_date = db.Column(db.Date, nullable=False)

    pickup_time = db.Column(db.Time)
    actual_pickup_time = db.Column(db.DateTime)
    actual_dropoff_time = db.Column(db.DateTime)
    driver_notes = db.Column(db.Text)

    # Relationships
    booking = db.relationship('Booking', back_populates='trips')