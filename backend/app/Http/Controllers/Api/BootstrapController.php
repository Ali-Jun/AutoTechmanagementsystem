<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Feedback;
use App\Models\Invoice;
use App\Models\Mechanic;
use App\Models\Payment;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BootstrapController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $bookings = Booking::with(['customer', 'vehicle', 'service', 'mechanic.user', 'invoice', 'feedback'])
            ->latest();
        $invoices = Invoice::with(['booking.customer', 'booking.service', 'booking.vehicle', 'payments'])
            ->latest();
        $payments = Payment::with(['invoice.booking.customer', 'invoice.booking.service', 'invoice.booking.vehicle'])
            ->latest();
        $feedback = Feedback::with(['customer', 'booking.service', 'booking.vehicle'])
            ->latest();

        if ($user->role === 'customer') {
            $bookings->where('customer_id', $user->id);
            $invoices->whereHas('booking', fn ($booking) => $booking->where('customer_id', $user->id));
            $payments->whereHas('invoice.booking', fn ($booking) => $booking->where('customer_id', $user->id));
            $feedback->where('customer_id', $user->id);
        }

        if ($user->role === 'mechanic') {
            $bookings->where('mechanic_id', $user->mechanic?->id);
        }

        $services = Service::query()->latest();

        if ($user->role !== 'admin') {
            $services->where('active', true);
        }

        return response()->json([
            'user' => $user,
            'services' => $services->get(),
            'bookings' => $bookings->get(),
            'mechanics' => Mechanic::with('user')->latest()->get(),
            'invoices' => $invoices->get(),
            'payments' => $payments->get(),
            'feedback' => $feedback->get(),
        ]);
    }
}
