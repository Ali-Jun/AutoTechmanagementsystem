<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Invoice;
use App\Models\Service;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Booking::with(['customer', 'vehicle', 'service', 'mechanic.user', 'invoice', 'feedback'])
            ->latest();

        if ($request->user()->role === 'customer') {
            $query->where('customer_id', $request->user()->id);
        }

        if ($request->user()->role === 'mechanic') {
            $mechanicId = $request->user()->mechanic?->id;
            $query->where('mechanic_id', $mechanicId);
        }

        return response()->json(['bookings' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['nullable', 'exists:users,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'vehicle.make' => ['required_without:vehicle_id', 'string', 'max:80'],
            'vehicle.model' => ['required_without:vehicle_id', 'string', 'max:80'],
            'vehicle.year' => ['required_without:vehicle_id', 'string', 'max:10'],
            'vehicle.plate' => ['required_without:vehicle_id', 'string', 'max:40'],
            'vehicle.mileage' => ['nullable', 'integer', 'min:0'],
            'service_id' => ['required', 'exists:services,id'],
            'appointment_date' => ['required', 'date'],
            'priority' => ['required', Rule::in(['Normal', 'High', 'Urgent'])],
            'notes' => ['nullable', 'string'],
            'mileage' => ['nullable', 'integer', 'min:0'],
        ]);

        $customerId = $request->user()->role === 'admin'
            ? ($data['customer_id'] ?? $request->user()->id)
            : $request->user()->id;

        $vehicleId = $data['vehicle_id'] ?? Vehicle::create([
            'customer_id' => $customerId,
            'make' => $data['vehicle']['make'],
            'model' => $data['vehicle']['model'],
            'year' => $data['vehicle']['year'],
            'plate' => $data['vehicle']['plate'],
            'mileage' => $data['vehicle']['mileage'] ?? $data['mileage'] ?? 0,
        ])->id;

        $booking = Booking::create([
            'customer_id' => $customerId,
            'vehicle_id' => $vehicleId,
            'service_id' => $data['service_id'],
            'mechanic_id' => null,
            'appointment_date' => $data['appointment_date'],
            'priority' => $data['priority'],
            'status' => 'Pending',
            'notes' => $data['notes'] ?? null,
            'mileage' => $data['mileage'] ?? $data['vehicle']['mileage'] ?? 0,
        ]);

        return response()->json([
            'booking' => $booking->load(['customer', 'vehicle', 'service', 'mechanic.user', 'invoice']),
        ], 201);
    }

    public function update(Request $request, Booking $booking): JsonResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'mechanic'], true), 403);

        $data = $request->validate([
            'mechanic_id' => ['nullable', 'exists:mechanics,id'],
            'appointment_date' => ['sometimes', 'date'],
            'priority' => ['sometimes', Rule::in(['Normal', 'High', 'Urgent'])],
            'status' => ['sometimes', Rule::in(['Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled'])],
            'notes' => ['nullable', 'string'],
            'mileage' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (isset($data['mechanic_id']) && $booking->status === 'Pending' && ! isset($data['status'])) {
            $data['status'] = 'Assigned';
        }

        $booking->update($data);

        if (($data['status'] ?? null) === 'Completed' && ! $booking->invoice) {
            $this->createInvoiceFor($booking);
        }

        return response()->json([
            'booking' => $booking->fresh()->load(['customer', 'vehicle', 'service', 'mechanic.user', 'invoice']),
        ]);
    }

    private function createInvoiceFor(Booking $booking): Invoice
    {
        $service = Service::findOrFail($booking->service_id);

        return Invoice::create([
            'booking_id' => $booking->id,
            'amount' => round($service->price * 1.13),
            'status' => 'Unpaid',
            'issued_on' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
        ]);
    }
}
