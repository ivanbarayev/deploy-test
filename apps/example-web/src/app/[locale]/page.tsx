"use client";

import Link from "next/link";

// import { prefetch, trpc } from "~/trpc/server";

// import "~/app/[locale]/_components/vendors.css";
// import "~/app/[locale]/_components/main.css";
// import "~/app/[locale]/_components/_page.css";

export default function HomePage() {
  // void prefetch(trpc.general.homepage.list.queryOptions()); //client-side

  // await prefetch(trpc.general.homepage.list.queryOptions()); // server-side

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            🚀 Payment Gateway Integration
          </h1>
          <p className="mb-8 text-lg text-gray-600">
            NowPayments & PayPal Test Dashboard
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Payments Test Dashboard */}
          <Link
            href="/payments"
            className="group rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 transition-all hover:border-blue-400 hover:shadow-lg"
          >
            <div className="mb-3 text-4xl">💳</div>
            <h2 className="mb-2 text-xl font-bold text-blue-900">
              Payments Dashboard
            </h2>
            <p className="mb-4 text-sm text-blue-700">
              Create test payments, view transaction history, and manage payment
              statuses
            </p>
            <div className="flex items-center text-blue-600 group-hover:text-blue-800">
              <span className="font-medium">Open Dashboard</span>
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          {/* Webhook Testing */}
          <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6">
            <div className="mb-3 text-4xl">🧪</div>
            <h2 className="mb-2 text-xl font-bold text-purple-900">
              Webhook Testing
            </h2>
            <p className="mb-4 text-sm text-purple-700">
              Test webhook handlers with fake payment data (finished, pending,
              failed, etc.)
            </p>
            <div className="text-xs text-purple-600">
              ✓ Available in Payments Dashboard
            </div>
          </div>

          {/* Features */}
          <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6">
            <div className="mb-3 text-4xl">✨</div>
            <h2 className="mb-2 text-xl font-bold text-green-900">Features</h2>
            <ul className="space-y-2 text-sm text-green-700">
              <li>✓ NowPayments crypto integration</li>
              <li>✓ PayPal payment processing</li>
              <li>✓ Real-time webhook handling</li>
              <li>✓ Payment status tracking</li>
              <li>✓ Test data generation</li>
            </ul>
          </div>

          {/* Documentation */}
          <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6">
            <div className="mb-3 text-4xl">📚</div>
            <h2 className="mb-2 text-xl font-bold text-orange-900">
              Documentation
            </h2>
            <ul className="space-y-1 text-sm text-orange-700">
              <li>• WEBHOOK_GUIDE.md</li>
              <li>• WEBHOOK_TESTING.md</li>
              <li>• FAKE_WEBHOOK_SETUP.md</li>
              <li>• NOWPAYMENTS_README.md</li>
            </ul>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold text-gray-900">🔧 Quick Setup</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              1. Configure{" "}
              <code className="rounded bg-gray-200 px-1">.env</code> with your
              API keys
            </p>
            <p>
              2. Start dev server:{" "}
              <code className="rounded bg-gray-200 px-1">
                pnpm dev:example-web
              </code>
            </p>
            <p>
              3. Open{" "}
              <Link
                href="/payments"
                className="font-medium text-blue-600 hover:underline"
              >
                Payments Dashboard
              </Link>
            </p>
            <p>4. Test webhooks with the built-in testing buttons</p>
          </div>
        </div>

        {/* Webhook URLs Info */}
        <div className="mt-4 rounded-lg border-2 border-blue-100 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">
            🔗 Webhook Endpoints
          </h3>
          <div className="space-y-2 text-xs text-blue-700">
            <div>
              <strong>NowPayments IPN:</strong>
              <code className="ml-2 rounded bg-white px-2 py-1">
                /api/webhooks/nowpayments
              </code>
            </div>
            <div>
              <strong>PayPal Webhook:</strong>
              <code className="ml-2 rounded bg-white px-2 py-1">
                /api/callbacks/paypal
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
