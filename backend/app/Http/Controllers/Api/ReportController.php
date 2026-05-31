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

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $statusCounts = Booking::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $serviceDemand = Service::query()
            ->withCount('bookings')
            ->orderByDesc('bookings_count')
            ->get(['id', 'name']);

        return response()->json([
            'summary' => [
                'bookings' => Booking::count(),
                'mechanics' => Mechanic::count(),
                'invoices' => Invoice::count(),
                'billed_amount' => Invoice::sum('amount'),
                'paid_amount' => Payment::sum('amount'),
                'average_rating' => round((float) Feedback::avg('rating'), 1),
            ],
            'status_counts' => $statusCounts,
            'service_demand' => $serviceDemand,
        ]);
    }
}
