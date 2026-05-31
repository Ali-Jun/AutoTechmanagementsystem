<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Feedback::with(['customer', 'booking.service'])->latest();

        if ($request->user()->role === 'customer') {
            $query->where('customer_id', $request->user()->id);
        }

        return response()->json(['feedback' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => ['required', 'exists:bookings,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'max:1000'],
        ]);

        $booking = Booking::findOrFail($data['booking_id']);

        abort_unless($booking->customer_id === $request->user()->id, 403);
        abort_unless($booking->status === 'Completed', 422, 'Feedback can only be submitted for completed bookings.');

        $feedback = Feedback::updateOrCreate(
            ['booking_id' => $booking->id],
            [
                'customer_id' => $request->user()->id,
                'rating' => $data['rating'],
                'comment' => $data['comment'],
            ],
        );

        return response()->json(['feedback' => $feedback->load(['customer', 'booking.service'])], 201);
    }
}
