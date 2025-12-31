"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? searchParams.get("orderId");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Payment Successful!
        </h1>
        <p className="mb-4 text-gray-600">
          Thank you for your payment. Your transaction has been completed.
        </p>
        {orderId && (
          <p className="mb-4 text-sm text-gray-500">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
        )}
        <Link
          href="/payments"
          className="inline-block rounded bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
        >
          Back to Payments
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
