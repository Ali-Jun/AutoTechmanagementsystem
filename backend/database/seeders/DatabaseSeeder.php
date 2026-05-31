<?php

namespace Database\Seeders;

use App\Models\Booking;
use App\Models\Feedback;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\Payment;
use App\Models\Service;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'name' => 'Sheraz Khan',
            'email' => 'admin@autotech.test',
            'password' => 'password',
            'role' => 'admin',
            'phone' => '+92 300 111 2222',
        ]);

        $customer = User::create([
            'name' => 'Hamza Khan',
            'email' => 'customer@autotech.test',
            'password' => 'password',
            'role' => 'customer',
            'phone' => '+92 321 555 0182',
        ]);

        $sara = User::create([
            'name' => 'Sara Ahmed',
            'email' => 'sara@autotech.test',
            'password' => 'password',
            'role' => 'customer',
            'phone' => '+92 333 890 1122',
        ]);

        $bilal = User::create([
            'name' => 'Bilal Khan',
            'email' => 'mechanic@autotech.test',
            'password' => 'password',
            'role' => 'mechanic',
            'phone' => '+92 311 782 0014',
        ]);

        $nadia = User::create([
            'name' => 'Nadia Raza',
            'email' => 'nadia@autotech.test',
            'password' => 'password',
            'role' => 'mechanic',
            'phone' => '+92 312 430 7070',
        ]);

        $corolla = Vehicle::create([
            'customer_id' => $customer->id,
            'make' => 'Toyota',
            'model' => 'Corolla',
            'year' => '2021',
            'plate' => 'LEA-4021',
            'mileage' => 38200,
        ]);

        $civic = Vehicle::create([
            'customer_id' => $customer->id,
            'make' => 'Honda',
            'model' => 'Civic',
            'year' => '2019',
            'plate' => 'ICT-7712',
            'mileage' => 64850,
        ]);

        $swift = Vehicle::create([
            'customer_id' => $sara->id,
            'make' => 'Suzuki',
            'model' => 'Swift',
            'year' => '2022',
            'plate' => 'BFX-2204',
            'mileage' => 21450,
        ]);

        $oil = Service::create([
            'name' => 'Oil and Filter Service',
            'category' => 'Preventive',
            'duration' => '45 min',
            'price' => 8500,
            'active' => true,
            'description' => 'Engine oil replacement, filter change, and 20 point inspection.',
        ]);

        $brake = Service::create([
            'name' => 'Brake Inspection',
            'category' => 'Safety',
            'duration' => '1 hr',
            'price' => 12000,
            'active' => true,
            'description' => 'Pad, rotor, fluid, and brake response inspection.',
        ]);

        Service::create([
            'name' => 'Engine Diagnostics',
            'category' => 'Repair',
            'duration' => '1.5 hr',
            'price' => 15000,
            'active' => true,
            'description' => 'OBD scan, fault analysis, and technician report.',
        ]);

        $ac = Service::create([
            'name' => 'AC Tune-up',
            'category' => 'Comfort',
            'duration' => '1 hr',
            'price' => 11000,
            'active' => true,
            'description' => 'Cooling performance check, gas pressure test, and cabin filter check.',
        ]);

        $tire = Service::create([
            'name' => 'Tire Rotation',
            'category' => 'Preventive',
            'duration' => '35 min',
            'price' => 4500,
            'active' => true,
            'description' => 'Rotation, pressure balancing, and tread inspection.',
        ]);

        $mechanicOne = Mechanic::create([
            'user_id' => $bilal->id,
            'specialty' => 'Engine diagnostics',
            'bay' => 'Bay 1',
            'status' => 'Available',
            'rating' => 4.8,
        ]);

        $mechanicTwo = Mechanic::create([
            'user_id' => $nadia->id,
            'specialty' => 'Brakes and suspension',
            'bay' => 'Bay 2',
            'status' => 'Available',
            'rating' => 4.7,
        ]);

        Booking::create([
            'customer_id' => $customer->id,
            'vehicle_id' => $corolla->id,
            'service_id' => $oil->id,
            'mechanic_id' => $mechanicOne->id,
            'appointment_date' => '2026-06-03',
            'priority' => 'Normal',
            'status' => 'In Progress',
            'notes' => 'Customer requested synthetic oil.',
            'mileage' => 38200,
        ]);

        $completedBrake = Booking::create([
            'customer_id' => $customer->id,
            'vehicle_id' => $civic->id,
            'service_id' => $brake->id,
            'mechanic_id' => $mechanicTwo->id,
            'appointment_date' => '2026-05-28',
            'priority' => 'High',
            'status' => 'Completed',
            'notes' => 'Brake pedal feels soft.',
            'mileage' => 64850,
        ]);

        Booking::create([
            'customer_id' => $sara->id,
            'vehicle_id' => $swift->id,
            'service_id' => $ac->id,
            'mechanic_id' => null,
            'appointment_date' => '2026-06-05',
            'priority' => 'Normal',
            'status' => 'Pending',
            'notes' => 'Cooling drops after 20 minutes.',
            'mileage' => 21450,
        ]);

        $completedTire = Booking::create([
            'customer_id' => $sara->id,
            'vehicle_id' => $swift->id,
            'service_id' => $tire->id,
            'mechanic_id' => $mechanicTwo->id,
            'appointment_date' => '2026-05-18',
            'priority' => 'Normal',
            'status' => 'Completed',
            'notes' => 'Routine rotation.',
            'mileage' => 21100,
        ]);

        Invoice::create([
            'booking_id' => $completedBrake->id,
            'amount' => 13560,
            'status' => 'Unpaid',
            'issued_on' => '2026-05-28',
            'due_date' => '2026-06-04',
        ]);

        $paidInvoice = Invoice::create([
            'booking_id' => $completedTire->id,
            'amount' => 5085,
            'status' => 'Paid',
            'issued_on' => '2026-05-18',
            'due_date' => '2026-05-25',
        ]);

        Payment::create([
            'invoice_id' => $paidInvoice->id,
            'amount' => 5085,
            'currency' => 'PKR',
            'method' => 'Cash',
            'reference' => 'PKR-'.$paidInvoice->id,
            'paid_on' => '2026-05-18',
        ]);

        Feedback::create([
            'booking_id' => $completedTire->id,
            'customer_id' => $sara->id,
            'rating' => 5,
            'comment' => 'Fast service and clear updates.',
        ]);
    }
}
