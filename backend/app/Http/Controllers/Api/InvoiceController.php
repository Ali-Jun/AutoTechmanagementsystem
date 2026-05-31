<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Invoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with(['booking.customer', 'booking.service', 'booking.vehicle', 'payments'])->latest();

        if ($request->user()->role === 'customer') {
            $query->whereHas('booking', fn ($booking) => $booking->where('customer_id', $request->user()->id));
        }

        return response()->json(['invoices' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $data = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
        ]);

        $booking = Booking::with('service')->findOrFail($data['booking_id']);

        $invoice = Invoice::firstOrCreate(
            ['booking_id' => $booking->id],
            [
                'amount' => round($booking->service->price * 1.13),
                'status' => 'Unpaid',
                'issued_on' => now()->toDateString(),
                'due_date' => now()->addDays(7)->toDateString(),
            ],
        );

        return response()->json(['invoice' => $invoice->load(['booking.customer', 'booking.service'])], 201);
    }
}
