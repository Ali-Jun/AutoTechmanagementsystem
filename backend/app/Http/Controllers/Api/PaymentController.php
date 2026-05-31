<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['invoice.booking.customer', 'invoice.booking.service'])->latest();

        if ($request->user()->role === 'customer') {
            $query->whereHas('invoice.booking', fn ($booking) => $booking->where('customer_id', $request->user()->id));
        }

        return response()->json(['payments' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'method' => ['required', Rule::in(['Cash', 'Easypaisa', 'JazzCash', 'Bank transfer', 'Card'])],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        $invoice = Invoice::with('booking')->findOrFail($data['invoice_id']);

        if ($request->user()->role === 'customer') {
            abort_unless($invoice->booking->customer_id === $request->user()->id, 403);
        }

        $payment = DB::transaction(function () use ($data, $invoice): Payment {
            $payment = Payment::firstOrCreate(
                ['invoice_id' => $invoice->id],
                [
                    'amount' => $invoice->amount,
                    'currency' => 'PKR',
                    'method' => $data['method'],
                    'reference' => $data['reference'] ?? 'PKR-'.$invoice->id,
                    'paid_on' => now()->toDateString(),
                ],
            );

            $invoice->update(['status' => 'Paid']);

            return $payment;
        });

        return response()->json([
            'payment' => $payment->load(['invoice.booking.customer', 'invoice.booking.service']),
        ], 201);
    }
}
