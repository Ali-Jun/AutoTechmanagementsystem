import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  CalendarPlus,
  Car,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  ReceiptText,
  Save,
  ShieldCheck,
  Star,
  UserCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { bookingStatuses, initialStore, priorities } from "./data/seedData.js";
import { apiClient, apiEnabled, setApiToken as setApiAuthToken } from "./lib/apiClient.js";

const storageKey = "autoTech.store.v1";
const currentUserKey = "autoTech.currentUser.v1";
const apiTokenKey = "autoTech.apiToken.v1";

const roleMeta = {
  admin: { label: "Admin", icon: ShieldCheck },
  customer: { label: "Customer", icon: Car },
  mechanic: { label: "Mechanic", icon: Wrench },
};

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "customer", "mechanic"] },
  { label: "Book Service", path: "/book", icon: CalendarPlus, roles: ["customer"] },
  { label: "Bookings", path: "/bookings", icon: ClipboardList, roles: ["admin", "customer"] },
  { label: "Work Orders", path: "/work-orders", icon: ClipboardCheck, roles: ["mechanic"] },
  { label: "Services", path: "/services", icon: Wrench, roles: ["admin"] },
  { label: "Mechanics", path: "/mechanics", icon: Users, roles: ["admin"] },
  { label: "Invoices", path: "/invoices", icon: ReceiptText, roles: ["admin", "customer"] },
  { label: "Payments", path: "/payments", icon: CreditCard, roles: ["admin", "customer"] },
  { label: "Feedback", path: "/feedback", icon: MessageSquare, roles: ["admin", "customer"] },
  { label: "Reports", path: "/reports", icon: FileBarChart2, roles: ["admin"] },
];

const paymentMethods = ["Cash", "Easypaisa", "JazzCash", "Bank transfer", "Card"];

function asId(value) {
  return value === null || value === undefined ? "" : String(value);
}

function uniqueById(items) {
  const records = new Map();

  items.filter((item) => item?.id).forEach((item) => {
    records.set(item.id, { ...records.get(item.id), ...item });
  });

  return Array.from(records.values());
}

function mapApiUser(user) {
  if (!user) return null;

  return {
    id: asId(user.id),
    name: user.name || "Unknown user",
    email: user.email || "",
    password: "",
    role: user.role || "customer",
    phone: user.phone || "",
  };
}

function mapApiVehicle(vehicle) {
  if (!vehicle) return null;

  return {
    id: asId(vehicle.id),
    customerId: asId(vehicle.customer_id ?? vehicle.customer?.id),
    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year || "",
    plate: vehicle.plate || "",
    mileage: Number(vehicle.mileage || 0),
  };
}

function mapApiService(service) {
  if (!service) return null;

  return {
    id: asId(service.id),
    name: service.name || "",
    category: service.category || "",
    duration: service.duration || "",
    price: Number(service.price || 0),
    active: Boolean(service.active),
    description: service.description || "",
  };
}

function mapApiMechanic(mechanic) {
  if (!mechanic) return null;

  return {
    id: asId(mechanic.id),
    userId: asId(mechanic.user_id ?? mechanic.user?.id),
    specialty: mechanic.specialty || "",
    bay: mechanic.bay || "",
    status: mechanic.status || "Available",
    rating: Number(mechanic.rating || 0),
  };
}

function mapApiBooking(booking) {
  if (!booking) return null;

  return {
    id: asId(booking.id),
    customerId: asId(booking.customer_id ?? booking.customer?.id),
    vehicleId: asId(booking.vehicle_id ?? booking.vehicle?.id),
    serviceId: asId(booking.service_id ?? booking.service?.id),
    mechanicId: asId(booking.mechanic_id ?? booking.mechanic?.id),
    appointmentDate: booking.appointment_date || "",
    priority: booking.priority || "Normal",
    status: booking.status || "Pending",
    notes: booking.notes || "",
    mileage: Number(booking.mileage || 0),
    createdAt: (booking.created_at || todayISO()).slice(0, 10),
  };
}

function mapApiInvoice(invoice) {
  if (!invoice) return null;

  return {
    id: asId(invoice.id),
    bookingId: asId(invoice.booking_id ?? invoice.booking?.id),
    amount: Number(invoice.amount || 0),
    status: invoice.status || "Unpaid",
    issuedOn: invoice.issued_on || "",
    dueDate: invoice.due_date || "",
  };
}

function mapApiPayment(payment) {
  if (!payment) return null;

  return {
    id: asId(payment.id),
    invoiceId: asId(payment.invoice_id ?? payment.invoice?.id),
    amount: Number(payment.amount || 0),
    currency: payment.currency || "PKR",
    method: payment.method || "Cash",
    reference: payment.reference || "",
    paidOn: payment.paid_on || "",
  };
}

function mapApiFeedback(feedback) {
  if (!feedback) return null;

  return {
    id: asId(feedback.id),
    bookingId: asId(feedback.booking_id ?? feedback.booking?.id),
    customerId: asId(feedback.customer_id ?? feedback.customer?.id),
    rating: Number(feedback.rating || 0),
    comment: feedback.comment || "",
    createdAt: (feedback.created_at || todayISO()).slice(0, 10),
  };
}

function buildStoreFromApi({ user, services = [], bookings = [], mechanics = [], invoices = [], payments = [], feedback = [] }) {
  const bookingInvoices = bookings.map((booking) => booking.invoice);
  const bookingFeedback = bookings.map((booking) => booking.feedback);
  const invoiceBookings = invoices.map((invoice) => invoice.booking);
  const paymentInvoices = payments.map((payment) => payment.invoice);
  const paymentBookings = paymentInvoices.map((invoice) => invoice?.booking);
  const feedbackBookings = feedback.map((item) => item.booking);

  return normalizeStore({
    users: uniqueById([
      mapApiUser(user),
      ...mechanics.map((mechanic) => mapApiUser(mechanic.user)),
      ...bookings.map((booking) => mapApiUser(booking.customer)),
      ...invoiceBookings.map((booking) => mapApiUser(booking?.customer)),
      ...paymentBookings.map((booking) => mapApiUser(booking?.customer)),
      ...feedback.map((item) => mapApiUser(item.customer)),
    ]),
    vehicles: uniqueById([
      ...bookings.map((booking) => mapApiVehicle(booking.vehicle)),
      ...invoiceBookings.map((booking) => mapApiVehicle(booking?.vehicle)),
      ...paymentBookings.map((booking) => mapApiVehicle(booking?.vehicle)),
      ...feedbackBookings.map((booking) => mapApiVehicle(booking?.vehicle)),
    ]),
    services: uniqueById([
      ...services.map(mapApiService),
      ...bookings.map((booking) => mapApiService(booking.service)),
      ...invoiceBookings.map((booking) => mapApiService(booking?.service)),
      ...paymentBookings.map((booking) => mapApiService(booking?.service)),
      ...feedbackBookings.map((booking) => mapApiService(booking?.service)),
    ]),
    mechanics: uniqueById([...mechanics.map(mapApiMechanic), ...bookings.map((booking) => mapApiMechanic(booking.mechanic))]),
    bookings: uniqueById([
      ...bookings.map(mapApiBooking),
      ...invoiceBookings.map(mapApiBooking),
      ...paymentBookings.map(mapApiBooking),
      ...feedbackBookings.map(mapApiBooking),
    ]),
    invoices: uniqueById([...invoices.map(mapApiInvoice), ...bookingInvoices.map(mapApiInvoice), ...paymentInvoices.map(mapApiInvoice)]),
    payments: uniqueById(payments.map(mapApiPayment)),
    feedback: uniqueById([...feedback.map(mapApiFeedback), ...bookingFeedback.map(mapApiFeedback)]),
  });
}

function getApiError(error, fallback) {
  const errors = error?.response?.data?.errors;
  const firstValidationError = errors ? Object.values(errors).flat()[0] : "";
  return firstValidationError || error?.response?.data?.message || fallback;
}

function toApiBookingPayload(customerId, payload) {
  const useExistingVehicle = payload.vehicleId && payload.vehicleId !== "new";

  return {
    customer_id: Number(customerId),
    service_id: Number(payload.serviceId),
    vehicle_id: useExistingVehicle ? Number(payload.vehicleId) : undefined,
    vehicle: useExistingVehicle
      ? undefined
      : {
          make: payload.vehicle.make,
          model: payload.vehicle.model,
          year: payload.vehicle.year,
          plate: payload.vehicle.plate,
          mileage: Number(payload.vehicle.mileage || 0),
        },
    appointment_date: payload.appointmentDate,
    priority: payload.priority,
    notes: payload.notes,
    mileage: Number(payload.vehicle.mileage || 0),
  };
}

function toApiBookingPatch(patch) {
  const payload = {};

  if ("mechanicId" in patch) payload.mechanic_id = patch.mechanicId ? Number(patch.mechanicId) : null;
  if ("appointmentDate" in patch) payload.appointment_date = patch.appointmentDate;
  if ("priority" in patch) payload.priority = patch.priority;
  if ("status" in patch) payload.status = patch.status;
  if ("notes" in patch) payload.notes = patch.notes;
  if ("mileage" in patch) payload.mileage = Number(patch.mileage || 0);

  return payload;
}

function normalizeStore(store) {
  return {
    ...store,
    users: (store.users || []).map((user) =>
      user.id === "u-admin" || user.email === "admin@autotech.test"
        ? { ...user, name: "Sheraz Khan" }
        : user,
    ),
    payments: (store.payments || []).map((payment) => {
      const { currency, reference, ...rest } = payment;
      return {
        ...rest,
        currency: "PKR",
        reference: reference || `PKR-${payment.invoiceId}`,
      };
    }),
  };
}

function usePersistentState(key, fallback, normalize = (value) => value) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return normalize(saved ? JSON.parse(saved) : fallback);
    } catch {
      return normalize(fallback);
    }
  });

  const setPersistentValue = (nextValue) => {
    setValue((previous) => {
      const resolved = normalize(typeof nextValue === "function" ? nextValue(previous) : nextValue);
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };

  return [value, setPersistentValue];
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function money(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return "Not set";
  const parsed = new Date(String(date).includes("T") ? date : `${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function getDetails(store, booking) {
  const customer = store.users.find((user) => user.id === booking.customerId);
  const vehicle = store.vehicles.find((item) => item.id === booking.vehicleId);
  const service = store.services.find((item) => item.id === booking.serviceId);
  const mechanic = store.mechanics.find((item) => item.id === booking.mechanicId);
  const mechanicUser = mechanic ? store.users.find((user) => user.id === mechanic.userId) : null;
  const invoice = store.invoices.find((item) => item.bookingId === booking.id);
  const feedback = store.feedback.find((item) => item.bookingId === booking.id);
  return { customer, vehicle, service, mechanic, mechanicUser, invoice, feedback };
}

function getVisibleInvoices(store, currentUser) {
  if (currentUser.role === "admin") return store.invoices;

  return store.invoices.filter((invoice) => {
    const booking = store.bookings.find((item) => item.id === invoice.bookingId);
    return booking?.customerId === currentUser.id;
  });
}

function App() {
  const [store, setStore] = usePersistentState(storageKey, initialStore, normalizeStore);
  const [currentUserId, setCurrentUserId] = usePersistentState(currentUserKey, null);
  const [apiToken, setApiTokenState] = usePersistentState(apiTokenKey, null);
  const [apiStatus, setApiStatus] = useState({ loading: apiEnabled && Boolean(apiToken), error: "" });
  const currentUser = apiEnabled && !apiToken ? null : store.users.find((user) => user.id === currentUserId);

  useEffect(() => {
    setStore((previous) => normalizeStore(previous));
  }, []);

  useEffect(() => {
    setApiAuthToken(apiToken);
  }, [apiToken]);

  async function hydrateApiStore(authUser = null) {
    if (!apiEnabled || (!apiToken && !authUser)) return store;

    setApiStatus({ loading: true, error: "" });

    try {
      const response = await apiClient.bootstrap();
      const data = response.data;
      const user = authUser || data.user;

      const nextStore = buildStoreFromApi({
        user,
        services: data.services,
        bookings: data.bookings,
        mechanics: data.mechanics,
        invoices: data.invoices,
        payments: data.payments,
        feedback: data.feedback,
      });

      setStore(nextStore);
      setCurrentUserId(asId(user.id));
      setApiStatus({ loading: false, error: "" });
      return nextStore;
    } catch (error) {
      const message = getApiError(error, "Could not reach the Laravel API.");
      setApiStatus({ loading: false, error: message });
      throw error;
    }
  }

  useEffect(() => {
    if (!apiEnabled || !apiToken) return;

    hydrateApiStore().catch(() => {
      setApiTokenState(null);
      setApiAuthToken(null);
      setCurrentUserId(null);
    });
  }, [apiToken]);

  const actions = {
    async login(email, password) {
      if (apiEnabled) {
        try {
          const response = await apiClient.login({ email, password });
          setApiAuthToken(response.data.token);
          setApiTokenState(response.data.token);
          setCurrentUserId(asId(response.data.user.id));
          await hydrateApiStore(response.data.user);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: getApiError(error, "Email or password did not match.") };
        }
      }

      const user = store.users.find(
        (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
      );

      if (!user || user.password !== password) {
        return { ok: false, message: "Email or password did not match." };
      }

      setCurrentUserId(user.id);
      return { ok: true };
    },

    async register(payload) {
      if (apiEnabled) {
        try {
          const response = await apiClient.register({
            name: payload.name.trim(),
            email: payload.email.trim().toLowerCase(),
            phone: payload.phone.trim(),
            password: payload.password,
            role: payload.role,
          });
          setApiAuthToken(response.data.token);
          setApiTokenState(response.data.token);
          setCurrentUserId(asId(response.data.user.id));
          await hydrateApiStore(response.data.user);
          return { ok: true };
        } catch (error) {
          return { ok: false, message: getApiError(error, "Could not create the account.") };
        }
      }

      const email = payload.email.trim().toLowerCase();
      const exists = store.users.some((user) => user.email.toLowerCase() === email);

      if (exists) {
        return { ok: false, message: "An account already exists with that email." };
      }

      const newUser = {
        id: createId("u"),
        name: payload.name.trim(),
        email,
        password: payload.password,
        role: payload.role,
        phone: payload.phone.trim(),
      };

      setStore((previous) => {
        const next = { ...previous, users: [...previous.users, newUser] };

        if (newUser.role === "mechanic") {
          next.mechanics = [
            ...previous.mechanics,
            {
              id: createId("m"),
              userId: newUser.id,
              specialty: "General service",
              bay: "Unassigned",
              status: "Available",
              rating: 4.5,
            },
          ];
        }

        return next;
      });
      setCurrentUserId(newUser.id);
      return { ok: true };
    },

    async logout() {
      if (apiEnabled && apiToken) {
        await apiClient.logout().catch(() => {});
        setApiTokenState(null);
        setApiAuthToken(null);
        localStorage.removeItem(apiTokenKey);
      }

      setCurrentUserId(null);
    },

    switchUser(userId) {
      if (apiEnabled) return;
      setCurrentUserId(userId);
    },

    async createBooking(customerId, payload) {
      if (apiEnabled) {
        const response = await apiClient.createBooking(toApiBookingPayload(customerId, payload));
        await hydrateApiStore();
        return asId(response.data.booking.id);
      }

      const vehicleId = payload.vehicleId && payload.vehicleId !== "new" ? payload.vehicleId : createId("v");
      const bookingId = createId("b");

      setStore((previous) => {
        const hasVehicle = previous.vehicles.some((vehicle) => vehicle.id === vehicleId);
        const vehicles = hasVehicle
          ? previous.vehicles
          : [
              ...previous.vehicles,
              {
                id: vehicleId,
                customerId,
                make: payload.vehicle.make,
                model: payload.vehicle.model,
                year: payload.vehicle.year,
                plate: payload.vehicle.plate,
                mileage: Number(payload.vehicle.mileage || 0),
              },
            ];

        return {
          ...previous,
          vehicles,
          bookings: [
            {
              id: bookingId,
              customerId,
              vehicleId,
              serviceId: payload.serviceId,
              mechanicId: "",
              appointmentDate: payload.appointmentDate,
              priority: payload.priority,
              status: "Pending",
              notes: payload.notes,
              mileage: Number(payload.vehicle.mileage || 0),
              createdAt: todayISO(),
            },
            ...previous.bookings,
          ],
        };
      });

      return bookingId;
    },

    async updateBooking(bookingId, patch) {
      if (apiEnabled) {
        await apiClient.updateBooking(bookingId, toApiBookingPatch(patch));
        await hydrateApiStore();
        return;
      }

      setStore((previous) => {
        const booking = previous.bookings.find((item) => item.id === bookingId);
        const shouldInvoice = patch.status === "Completed" && !previous.invoices.some((item) => item.bookingId === bookingId);
        const service = booking ? previous.services.find((item) => item.id === booking.serviceId) : null;
        const nextInvoices =
          shouldInvoice && service
            ? [
                ...previous.invoices,
                {
                  id: createId("i"),
                  bookingId,
                  amount: Math.round(service.price * 1.13),
                  status: "Unpaid",
                  issuedOn: todayISO(),
                  dueDate: addDays(todayISO(), 7),
                },
              ]
            : previous.invoices;

        return {
          ...previous,
          bookings: previous.bookings.map((item) =>
            item.id === bookingId
              ? {
                  ...item,
                  ...patch,
                  status: patch.mechanicId && item.status === "Pending" ? "Assigned" : patch.status || item.status,
                }
              : item,
          ),
          invoices: nextInvoices,
        };
      });
    },

    async addService(payload) {
      if (apiEnabled) {
        await apiClient.createService({
          name: payload.name,
          category: payload.category,
          duration: payload.duration,
          price: Number(payload.price || 0),
          description: payload.description,
        });
        await hydrateApiStore();
        return;
      }

      setStore((previous) => ({
        ...previous,
        services: [
          ...previous.services,
          {
            id: createId("s"),
            name: payload.name,
            category: payload.category,
            duration: payload.duration,
            price: Number(payload.price || 0),
            active: true,
            description: payload.description,
          },
        ],
      }));
    },

    async toggleService(serviceId) {
      if (apiEnabled) {
        const service = store.services.find((item) => item.id === serviceId);
        if (!service) return;
        await apiClient.updateService(serviceId, { active: !service.active });
        await hydrateApiStore();
        return;
      }

      setStore((previous) => ({
        ...previous,
        services: previous.services.map((service) =>
          service.id === serviceId ? { ...service, active: !service.active } : service,
        ),
      }));
    },

    async addMechanic(payload) {
      if (apiEnabled) {
        await apiClient.createMechanic({
          name: payload.name,
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone,
          specialty: payload.specialty,
          bay: payload.bay,
          rating: Number(payload.rating || 4.5),
        });
        await hydrateApiStore();
        return;
      }

      const userId = createId("u");
      setStore((previous) => ({
        ...previous,
        users: [
          ...previous.users,
          {
            id: userId,
            name: payload.name,
            email: payload.email.trim().toLowerCase(),
            password: "password",
            role: "mechanic",
            phone: payload.phone,
          },
        ],
        mechanics: [
          ...previous.mechanics,
          {
            id: createId("m"),
            userId,
            specialty: payload.specialty,
            bay: payload.bay,
            status: "Available",
            rating: Number(payload.rating || 4.5),
          },
        ],
      }));
    },

    async generateInvoice(bookingId) {
      if (apiEnabled) {
        await apiClient.createInvoice({ booking_id: Number(bookingId) });
        await hydrateApiStore();
        return;
      }

      setStore((previous) => {
        if (previous.invoices.some((invoice) => invoice.bookingId === bookingId)) return previous;
        const booking = previous.bookings.find((item) => item.id === bookingId);
        const service = booking ? previous.services.find((item) => item.id === booking.serviceId) : null;
        if (!booking || !service) return previous;

        return {
          ...previous,
          invoices: [
            ...previous.invoices,
            {
              id: createId("i"),
              bookingId,
              amount: Math.round(service.price * 1.13),
              status: "Unpaid",
              issuedOn: todayISO(),
              dueDate: addDays(todayISO(), 7),
            },
          ],
        };
      });
    },

    async markInvoicePaid(invoiceId, method = "Portal", reference = "") {
      if (apiEnabled) {
        await apiClient.createPayment({
          invoice_id: Number(invoiceId),
          method,
          reference: reference.trim() || undefined,
        });
        await hydrateApiStore();
        return;
      }

      setStore((previous) => {
        const invoice = previous.invoices.find((item) => item.id === invoiceId);
        if (!invoice) return previous;
        const alreadyRecorded = previous.payments.some((payment) => payment.invoiceId === invoiceId);

        return {
          ...previous,
          invoices: previous.invoices.map((item) =>
            item.id === invoiceId ? { ...item, status: "Paid" } : item,
          ),
          payments: alreadyRecorded
            ? previous.payments
            : [
                ...previous.payments,
                {
                  id: createId("p"),
                  invoiceId,
                  amount: invoice.amount,
                  currency: "PKR",
                  method,
                  reference: reference.trim() || `PKR-${invoice.id}`,
                  paidOn: todayISO(),
                },
              ],
        };
      });
    },

    async submitFeedback(payload) {
      if (apiEnabled) {
        await apiClient.createFeedback({
          booking_id: Number(payload.bookingId),
          rating: Number(payload.rating),
          comment: payload.comment,
        });
        await hydrateApiStore();
        return;
      }

      setStore((previous) => ({
        ...previous,
        feedback: [
          ...previous.feedback.filter((item) => item.bookingId !== payload.bookingId),
          {
            id: createId("f"),
            bookingId: payload.bookingId,
            customerId: payload.customerId,
            rating: Number(payload.rating),
            comment: payload.comment,
            createdAt: todayISO(),
          },
        ],
      }));
    },

    async resetDemo() {
      if (apiEnabled && apiToken) {
        await hydrateApiStore();
        return;
      }

      localStorage.removeItem(storageKey);
      setStore(initialStore);
    },
  };

  if (!currentUser) {
    return <AuthScreen store={store} actions={actions} apiStatus={apiStatus} />;
  }

  return (
    <Shell store={store} currentUser={currentUser} actions={actions}>
      {apiStatus.error ? <div className="notice error">{apiStatus.error}</div> : null}
      <Routes>
        <Route path="/" element={<Dashboard store={store} currentUser={currentUser} actions={actions} />} />
        <Route
          path="/book"
          element={
            <RoleRoute currentUser={currentUser} roles={["customer"]}>
              <BookService store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/bookings"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin", "customer"]}>
              <BookingsPage store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/work-orders"
          element={
            <RoleRoute currentUser={currentUser} roles={["mechanic"]}>
              <WorkOrdersPage store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/services"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin"]}>
              <ServicesPage store={store} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/mechanics"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin"]}>
              <MechanicsPage store={store} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin", "customer"]}>
              <InvoicesPage store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin", "customer"]}>
              <PaymentsPage store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin", "customer"]}>
              <FeedbackPage store={store} currentUser={currentUser} actions={actions} />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute currentUser={currentUser} roles={["admin"]}>
              <ReportsPage store={store} />
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function RoleRoute({ currentUser, roles, children }) {
  if (!roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return children;
}

function AuthScreen({ store, actions, apiStatus }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "admin@autotech.test", password: "password" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const demoUsers = ["admin", "customer", "mechanic"]
    .map((role) => store.users.find((user) => user.role === role))
    .filter(Boolean);

  const submitLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await actions.login(loginForm.email, loginForm.password);
    setSubmitting(false);
    if (!result.ok) setError(result.message);
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setError("");
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      setError("Name, email, and password are required.");
      return;
    }
    setSubmitting(true);
    const result = await actions.register(registerForm);
    setSubmitting(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="Auto service bay">
        <img src="/service-bay.png" alt="Modern auto service bay" />
        <div className="auth-visual-overlay">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Wrench size={28} />
            </div>
            <div>
              <strong>Auto Tech</strong>
              <span>Management System</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label="Authentication">
        <div className="auth-card">
          <div className="auth-heading">
            <p className="section-kicker">Garage operations</p>
            <h1>Service bookings, workshop jobs, invoices, and feedback in one place.</h1>
          </div>

          <div className="segmented-control" role="tablist" aria-label="Authentication mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
              Login
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
              Register
            </button>
          </div>

          {apiStatus?.error ? <div className="notice error">{apiStatus.error}</div> : null}
          {error ? <div className="notice error">{error}</div> : null}

          {mode === "login" ? (
            <form className="form-stack" onSubmit={submitLogin}>
              <label className="field">
                <span>Email</span>
                <input
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  type="email"
                  autoComplete="email"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  type="password"
                  autoComplete="current-password"
                />
              </label>
              <button className="primary-button" type="submit" disabled={submitting}>
                <CheckCircle2 size={18} />
                {submitting ? "Signing in" : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="form-stack" onSubmit={submitRegister}>
              <div className="two-column">
                <label className="field">
                  <span>Name</span>
                  <input
                    value={registerForm.name}
                    onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={registerForm.phone}
                    onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })}
                  />
                </label>
              </div>
              <label className="field">
                <span>Email</span>
                <input
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                  type="email"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  type="password"
                />
              </label>
              <div className="role-picker" aria-label="Account role">
                {Object.entries(roleMeta).map(([role, meta]) => {
                  const RoleIcon = meta.icon;
                  return (
                    <button
                      key={role}
                      className={registerForm.role === role ? "active" : ""}
                      type="button"
                      onClick={() => setRegisterForm({ ...registerForm, role })}
                    >
                      <RoleIcon size={18} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <button className="primary-button" type="submit" disabled={submitting}>
                <Plus size={18} />
                {submitting ? "Creating" : "Create account"}
              </button>
            </form>
          )}

          <div className="demo-accounts">
            {demoUsers.map((user) => {
              const RoleIcon = roleMeta[user.role].icon;
              return (
                <button key={user.id} type="button" onClick={() => actions.login(user.email, "password")}>
                  <RoleIcon size={16} />
                  <span>{roleMeta[user.role].label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function Shell({ store, currentUser, actions, children }) {
  const [navOpen, setNavOpen] = useState(false);
  const allowedNav = navItems.filter((item) => item.roles.includes(currentUser.role));
  const RoleIcon = roleMeta[currentUser.role].icon;

  return (
    <div className="app-shell">
      <aside className={navOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Wrench size={25} />
          </div>
          <div>
            <strong>Auto Tech</strong>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setNavOpen(false)}>
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="ghost-button" onClick={actions.resetDemo} type="button">
            <Activity size={17} />
            Reset demo
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setNavOpen((open) => !open)} type="button" title="Menu">
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="topbar-title">
            <p className="section-kicker">Workshop portal</p>
            <h2>{roleMeta[currentUser.role].label} workspace</h2>
          </div>

          <div className="topbar-actions">
            <button className="icon-button" type="button" title="Notifications">
              <Bell size={19} />
            </button>
            <label className="account-switcher">
              <RoleIcon size={17} />
              <select value={currentUser.id} onChange={(event) => actions.switchUser(event.target.value)} disabled={apiEnabled}>
                {store.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleMeta[user.role].label}
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost-button" onClick={actions.logout} type="button">
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>

        <main className="content-shell">{children}</main>
      </div>
    </div>
  );
}

function Dashboard({ store, currentUser, actions }) {
  if (currentUser.role === "customer") {
    return <CustomerDashboard store={store} currentUser={currentUser} actions={actions} />;
  }

  if (currentUser.role === "mechanic") {
    return <MechanicDashboard store={store} currentUser={currentUser} actions={actions} />;
  }

  return <AdminDashboard store={store} actions={actions} />;
}

function AdminDashboard({ store, actions }) {
  const openBookings = store.bookings.filter((booking) => !["Completed", "Cancelled"].includes(booking.status));
  const paidRevenue = store.invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const satisfaction = average(store.feedback.map((item) => item.rating));
  const unassigned = store.bookings.filter((booking) => !booking.mechanicId && booking.status !== "Cancelled");

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Admin dashboard"
        title="Workshop control center"
        description="Track booking flow, assignments, invoices, service capacity, and customer experience."
      />

      <div className="metric-grid">
        <MetricCard icon={ClipboardList} label="Open bookings" value={openBookings.length} tone="teal" />
        <MetricCard icon={Users} label="Mechanics" value={store.mechanics.length} tone="amber" />
        <MetricCard icon={CreditCard} label="Paid revenue" value={money(paidRevenue)} tone="green" />
        <MetricCard icon={Star} label="Avg. rating" value={satisfaction ? satisfaction.toFixed(1) : "0.0"} tone="rose" />
      </div>

      <div className="dashboard-grid">
        <section className="panel span-2">
          <PanelHeader title="Booking queue" actionLabel="Manage" actionTo="/bookings" />
          <BookingTable store={store} bookings={store.bookings.slice(0, 6)} actions={actions} compact />
        </section>

        <section className="panel">
          <PanelHeader title="Needs assignment" />
          <div className="item-list">
            {unassigned.length ? (
              unassigned.slice(0, 4).map((booking) => {
                const details = getDetails(store, booking);
                return (
                  <div className="list-row" key={booking.id}>
                    <div>
                      <strong>{details.service?.name}</strong>
                      <span>
                        {details.customer?.name} - {formatDate(booking.appointmentDate)}
                      </span>
                    </div>
                    <StatusBadge status={booking.priority} />
                  </div>
                );
              })
            ) : (
              <EmptyState title="All bookings are assigned." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CustomerDashboard({ store, currentUser, actions }) {
  const bookings = store.bookings.filter((booking) => booking.customerId === currentUser.id);
  const vehicles = store.vehicles.filter((vehicle) => vehicle.customerId === currentUser.id);
  const invoices = store.invoices.filter((invoice) =>
    bookings.some((booking) => booking.id === invoice.bookingId),
  );
  const unpaid = invoices.filter((invoice) => invoice.status === "Unpaid");
  const nextBooking = bookings
    .filter((booking) => !["Completed", "Cancelled"].includes(booking.status))
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Customer dashboard"
        title={`Welcome back, ${currentUser.name}`}
        description="Book service, follow job status, review invoices, and share feedback."
      />

      <div className="metric-grid">
        <MetricCard icon={Car} label="Vehicles" value={vehicles.length} tone="teal" />
        <MetricCard icon={CalendarDays} label="Active bookings" value={bookings.filter((item) => !["Completed", "Cancelled"].includes(item.status)).length} tone="amber" />
        <MetricCard icon={ReceiptText} label="Unpaid invoices" value={unpaid.length} tone="rose" />
        <MetricCard icon={MessageSquare} label="Feedback sent" value={store.feedback.filter((item) => item.customerId === currentUser.id).length} tone="green" />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeader title="Next appointment" actionLabel="Book service" actionTo="/book" />
          {nextBooking ? (
            <BookingSummary store={store} booking={nextBooking} />
          ) : (
            <EmptyState title="No active appointment." actionLabel="Book service" actionTo="/book" />
          )}
        </section>
        <section className="panel span-2">
          <PanelHeader title="Recent bookings" actionLabel="View all" actionTo="/bookings" />
          <BookingTable store={store} bookings={bookings.slice(0, 5)} actions={actions} compact />
        </section>
      </div>
    </div>
  );
}

function MechanicDashboard({ store, currentUser, actions }) {
  const mechanic = store.mechanics.find((item) => item.userId === currentUser.id);
  const assigned = mechanic ? store.bookings.filter((booking) => booking.mechanicId === mechanic.id) : [];
  const active = assigned.filter((booking) => ["Assigned", "In Progress"].includes(booking.status));

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Mechanic dashboard"
        title={`Bay workload for ${currentUser.name}`}
        description="Review assigned jobs, inspect service notes, and move work orders through completion."
      />

      <div className="metric-grid">
        <MetricCard icon={ClipboardCheck} label="Assigned jobs" value={assigned.length} tone="teal" />
        <MetricCard icon={Gauge} label="In progress" value={assigned.filter((item) => item.status === "In Progress").length} tone="amber" />
        <MetricCard icon={CheckCircle2} label="Completed" value={assigned.filter((item) => item.status === "Completed").length} tone="green" />
        <MetricCard icon={Star} label="Rating" value={mechanic?.rating || "0.0"} tone="rose" />
      </div>

      <section className="panel">
        <PanelHeader title="Active work orders" actionLabel="Open work orders" actionTo="/work-orders" />
        {active.length ? (
          <BookingTable store={store} bookings={active} actions={actions} compact />
        ) : (
          <EmptyState title="No active jobs assigned." />
        )}
      </section>
    </div>
  );
}

function BookService({ store, currentUser, actions }) {
  const navigate = useNavigate();
  const customerVehicles = store.vehicles.filter((vehicle) => vehicle.customerId === currentUser.id);
  const activeServices = store.services.filter((service) => service.active);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    serviceId: activeServices[0]?.id || "",
    vehicleId: customerVehicles[0]?.id || "new",
    appointmentDate: addDays(todayISO(), 1),
    priority: "Normal",
    make: "",
    model: "",
    year: "2024",
    plate: "",
    mileage: "",
    notes: "",
  });

  const selectedVehicle = customerVehicles.find((vehicle) => vehicle.id === form.vehicleId);

  const submit = async (event) => {
    event.preventDefault();
    const vehicle = selectedVehicle || {
      make: form.make,
      model: form.model,
      year: form.year,
      plate: form.plate,
      mileage: form.mileage,
    };

    const bookingId = await actions.createBooking(currentUser.id, {
      serviceId: form.serviceId,
      vehicleId: selectedVehicle?.id || "new",
      appointmentDate: form.appointmentDate,
      priority: form.priority,
      notes: form.notes,
      vehicle,
    });

    setNotice(`Booking ${bookingId} created.`);
    navigate("/bookings");
  };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Book service"
        title="Schedule a vehicle service"
        description="Choose the service, vehicle, priority, and appointment date."
      />

      {notice ? <div className="notice success">{notice}</div> : null}

      <div className="split-layout">
        <section className="panel">
          <PanelHeader title="Booking details" />
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Service</span>
              <select value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
                {activeServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {money(service.price)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Vehicle</span>
              <select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
                {customerVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.plate}
                  </option>
                ))}
                <option value="new">Add a new vehicle</option>
              </select>
            </label>

            {form.vehicleId === "new" ? (
              <div className="two-column">
                <label className="field">
                  <span>Make</span>
                  <input value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Model</span>
                  <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Year</span>
                  <input value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Plate</span>
                  <input value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value })} required />
                </label>
              </div>
            ) : null}

            <div className="two-column">
              <label className="field">
                <span>Appointment</span>
                <input
                  value={form.appointmentDate}
                  min={todayISO()}
                  onChange={(event) => setForm({ ...form, appointmentDate: event.target.value })}
                  type="date"
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Mileage</span>
              <input
                value={form.mileage}
                onChange={(event) => setForm({ ...form, mileage: event.target.value })}
                type="number"
                min="0"
                placeholder={selectedVehicle ? String(selectedVehicle.mileage) : "0"}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="4" />
            </label>
            <button className="primary-button" type="submit">
              <CalendarPlus size={18} />
              Create booking
            </button>
          </form>
        </section>

        <section className="catalog-grid">
          {activeServices.map((service) => (
            <article className="service-tile" key={service.id}>
              <div className="tile-icon">
                <Wrench size={20} />
              </div>
              <div>
                <strong>{service.name}</strong>
                <span>{service.category}</span>
              </div>
              <p>{service.description}</p>
              <div className="tile-meta">
                <span>{service.duration}</span>
                <strong>{money(service.price)}</strong>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function BookingsPage({ store, currentUser, actions }) {
  const bookings =
    currentUser.role === "admin"
      ? store.bookings
      : store.bookings.filter((booking) => booking.customerId === currentUser.id);

  return (
    <div className="page-stack">
      <PageHeader
        kicker={currentUser.role === "admin" ? "Booking management" : "My bookings"}
        title={currentUser.role === "admin" ? "Assign and track service jobs" : "Track your service requests"}
        description="Manage booking status, mechanic assignment, invoice generation, and service history."
      />
      <section className="panel">
        <BookingTable store={store} bookings={bookings} actions={actions} interactive={currentUser.role === "admin"} />
      </section>
    </div>
  );
}

function WorkOrdersPage({ store, currentUser, actions }) {
  const mechanic = store.mechanics.find((item) => item.userId === currentUser.id);
  const bookings = mechanic ? store.bookings.filter((booking) => booking.mechanicId === mechanic.id) : [];

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Work orders"
        title="Assigned workshop jobs"
        description="Update status as each repair moves through the bay."
      />
      <section className="work-order-grid">
        {bookings.length ? (
          bookings.map((booking) => {
            const details = getDetails(store, booking);
            return (
              <article className="work-order" key={booking.id}>
                <div className="work-order-head">
                  <div>
                    <strong>{details.service?.name}</strong>
                    <span>
                      {details.vehicle?.year} {details.vehicle?.make} {details.vehicle?.model} - {details.vehicle?.plate}
                    </span>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
                <p>{booking.notes || "No service notes added."}</p>
                <div className="work-order-meta">
                  <span>{formatDate(booking.appointmentDate)}</span>
                  <span>{booking.mileage.toLocaleString()} km</span>
                  <span>{booking.priority}</span>
                </div>
                <div className="button-row">
                  {["Assigned", "In Progress", "Completed"].map((status) => (
                    <button
                      key={status}
                      className={booking.status === status ? "small-button active" : "small-button"}
                      onClick={() => actions.updateBooking(booking.id, { status })}
                      type="button"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState title="No assigned work orders." />
        )}
      </section>
    </div>
  );
}

function ServicesPage({ store, actions }) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    duration: "1 hr",
    price: "",
    description: "",
  });

  const submit = async (event) => {
    event.preventDefault();
    await actions.addService(form);
    setForm({ name: "", category: "", duration: "1 hr", price: "", description: "" });
  };

  return (
    <div className="page-stack">
      <PageHeader kicker="Service catalog" title="Manage workshop services" description="Add, price, and enable service offerings." />

      <div className="split-layout">
        <section className="panel">
          <PanelHeader title="Add service" />
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <div className="two-column">
              <label className="field">
                <span>Category</span>
                <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
              </label>
              <label className="field">
                <span>Duration</span>
                <input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} required />
              </label>
            </div>
            <label className="field">
              <span>Price</span>
              <input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} type="number" min="0" required />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" />
            </label>
            <button className="primary-button" type="submit">
              <Save size={18} />
              Save service
            </button>
          </form>
        </section>

        <section className="catalog-grid">
          {store.services.map((service) => (
            <article className={service.active ? "service-tile" : "service-tile muted"} key={service.id}>
              <div className="tile-icon">
                <Wrench size={20} />
              </div>
              <div>
                <strong>{service.name}</strong>
                <span>{service.category}</span>
              </div>
              <p>{service.description}</p>
              <div className="tile-meta">
                <span>{money(service.price)}</span>
                <button className="small-button" type="button" onClick={() => actions.toggleService(service.id)}>
                  {service.active ? "Disable" : "Enable"}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function MechanicsPage({ store, actions }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    bay: "Bay 3",
    rating: "4.5",
  });

  const submit = async (event) => {
    event.preventDefault();
    await actions.addMechanic(form);
    setForm({ name: "", email: "", phone: "", specialty: "", bay: "Bay 3", rating: "4.5" });
  };

  return (
    <div className="page-stack">
      <PageHeader kicker="Mechanics" title="Manage mechanic roster" description="Add technicians and track active booking load." />
      <div className="split-layout">
        <section className="panel">
          <PanelHeader title="Add mechanic" />
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" required />
            </label>
            <div className="two-column">
              <label className="field">
                <span>Phone</span>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
              </label>
              <label className="field">
                <span>Bay</span>
                <input value={form.bay} onChange={(event) => setForm({ ...form, bay: event.target.value })} required />
              </label>
            </div>
            <label className="field">
              <span>Specialty</span>
              <input value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} required />
            </label>
            <button className="primary-button" type="submit">
              <UserCog size={18} />
              Add mechanic
            </button>
          </form>
        </section>

        <section className="panel span-2">
          <PanelHeader title="Roster" />
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Bay</th>
                  <th>Active jobs</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {store.mechanics.map((mechanic) => {
                  const user = store.users.find((item) => item.id === mechanic.userId);
                  const activeJobs = store.bookings.filter(
                    (booking) => booking.mechanicId === mechanic.id && ["Assigned", "In Progress"].includes(booking.status),
                  ).length;
                  return (
                    <tr key={mechanic.id}>
                      <td>
                        <strong>{user?.name}</strong>
                        <span>{user?.email}</span>
                      </td>
                      <td>{mechanic.specialty}</td>
                      <td>{mechanic.bay}</td>
                      <td>{activeJobs}</td>
                      <td>{mechanic.rating}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function InvoicesPage({ store, currentUser, actions }) {
  const allowedInvoices = getVisibleInvoices(store, currentUser);

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Invoices"
        title="Billing in PKR"
        description="Review generated invoices and move unpaid balances into the payment workflow."
      />
      <section className="panel">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allowedInvoices.map((invoice) => {
                const booking = store.bookings.find((item) => item.id === invoice.bookingId);
                const details = booking ? getDetails(store, booking) : {};
                return (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.id}</strong>
                      <span>{booking?.id}</span>
                    </td>
                    <td>{details.customer?.name}</td>
                    <td>{details.service?.name}</td>
                    <td>{formatDate(invoice.issuedOn)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>{money(invoice.amount)}</td>
                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td>
                      {invoice.status === "Unpaid" ? (
                        <NavLink className="small-link" to="/payments">
                          Pay now
                        </NavLink>
                      ) : (
                        <span className="muted-text">Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PaymentsPage({ store, currentUser, actions }) {
  const visibleInvoices = getVisibleInvoices(store, currentUser);
  const unpaidInvoices = visibleInvoices.filter((invoice) => invoice.status === "Unpaid");
  const visibleInvoiceIds = new Set(visibleInvoices.map((invoice) => invoice.id));
  const paymentHistory = store.payments
    .filter((payment) => visibleInvoiceIds.has(payment.invoiceId))
    .slice()
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn));
  const [form, setForm] = useState({
    invoiceId: unpaidInvoices[0]?.id || "",
    method: "Easypaisa",
    reference: "",
  });

  const activeInvoice = unpaidInvoices.find((invoice) => invoice.id === form.invoiceId) || unpaidInvoices[0];
  const activeBooking = activeInvoice ? store.bookings.find((booking) => booking.id === activeInvoice.bookingId) : null;
  const activeDetails = activeBooking ? getDetails(store, activeBooking) : {};

  const submit = async (event) => {
    event.preventDefault();
    if (!activeInvoice) return;
    await actions.markInvoicePaid(activeInvoice.id, form.method, form.reference);
    const nextUnpaid = unpaidInvoices.find((invoice) => invoice.id !== activeInvoice.id);
    setForm({ invoiceId: nextUnpaid?.id || "", method: form.method, reference: "" });
  };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Payments"
        title="Record payments in PKR"
        description="Collect invoice payments with local payment methods and keep a clear payment history."
      />

      <div className="metric-grid">
        <MetricCard icon={ReceiptText} label="Unpaid invoices" value={unpaidInvoices.length} tone="amber" />
        <MetricCard
          icon={CreditCard}
          label="Amount due"
          value={money(unpaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))}
          tone="rose"
        />
        <MetricCard icon={CheckCircle2} label="Payments recorded" value={paymentHistory.length} tone="green" />
        <MetricCard
          icon={Gauge}
          label="Collected"
          value={money(paymentHistory.reduce((sum, payment) => sum + payment.amount, 0))}
          tone="teal"
        />
      </div>

      <div className="split-layout">
        <section className="panel">
          <PanelHeader title={currentUser.role === "customer" ? "Make payment" : "Record payment"} />
          {activeInvoice ? (
            <form className="form-stack" onSubmit={submit}>
              <label className="field">
                <span>Invoice</span>
                <select
                  value={activeInvoice.id}
                  onChange={(event) => setForm({ ...form, invoiceId: event.target.value })}
                >
                  {unpaidInvoices.map((invoice) => {
                    const booking = store.bookings.find((item) => item.id === invoice.bookingId);
                    const details = booking ? getDetails(store, booking) : {};
                    return (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.id} - {details.service?.name} - {money(invoice.amount)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="payment-summary">
                <div>
                  <span>Customer</span>
                  <strong>{activeDetails.customer?.name}</strong>
                </div>
                <div>
                  <span>Service</span>
                  <strong>{activeDetails.service?.name}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{money(activeInvoice.amount)}</strong>
                </div>
              </div>

              <label className="field">
                <span>Payment method</span>
                <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Transaction reference</span>
                <input
                  value={form.reference}
                  onChange={(event) => setForm({ ...form, reference: event.target.value })}
                  placeholder="Optional receipt, transfer, or wallet reference"
                />
              </label>

              <button className="primary-button" type="submit">
                <CreditCard size={18} />
                {currentUser.role === "customer" ? "Pay invoice" : "Record payment"}
              </button>
            </form>
          ) : (
            <EmptyState title="No unpaid invoices." actionLabel="View invoices" actionTo="/invoices" />
          )}
        </section>

        <section className="panel span-2">
          <PanelHeader title="Payment history" />
          {paymentHistory.length ? (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Payment</th>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Paid on</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => {
                    const invoice = store.invoices.find((item) => item.id === payment.invoiceId);
                    const booking = invoice ? store.bookings.find((item) => item.id === invoice.bookingId) : null;
                    const details = booking ? getDetails(store, booking) : {};
                    return (
                      <tr key={payment.id}>
                        <td>
                          <strong>{payment.id}</strong>
                          <span>{payment.currency || "PKR"}</span>
                        </td>
                        <td>{payment.invoiceId}</td>
                        <td>{details.customer?.name}</td>
                        <td>{payment.method}</td>
                        <td>{payment.reference || "Manual entry"}</td>
                        <td>{formatDate(payment.paidOn)}</td>
                        <td>{money(payment.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No payments recorded yet." />
          )}
        </section>
      </div>
    </div>
  );
}

function FeedbackPage({ store, currentUser, actions }) {
  if (currentUser.role === "admin") {
    return (
      <div className="page-stack">
        <PageHeader kicker="Feedback" title="Customer satisfaction" description="Review ratings and comments from completed services." />
        <section className="feedback-grid">
          {store.feedback.map((feedback) => {
            const booking = store.bookings.find((item) => item.id === feedback.bookingId);
            const details = booking ? getDetails(store, booking) : {};
            return (
              <article className="feedback-card" key={feedback.id}>
                <div className="rating-row">{Array.from({ length: feedback.rating }, (_, index) => <Star key={index} size={17} fill="currentColor" />)}</div>
                <p>{feedback.comment}</p>
                <span>
                  {details.customer?.name} - {details.service?.name}
                </span>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  return <CustomerFeedback store={store} currentUser={currentUser} actions={actions} />;
}

function CustomerFeedback({ store, currentUser, actions }) {
  const completed = store.bookings.filter(
    (booking) => booking.customerId === currentUser.id && booking.status === "Completed",
  );
  const [form, setForm] = useState({
    bookingId: completed[0]?.id || "",
    rating: 5,
    comment: "",
  });

  const submit = async (event) => {
    event.preventDefault();
    await actions.submitFeedback({ ...form, customerId: currentUser.id });
    setForm({ ...form, comment: "" });
  };

  return (
    <div className="page-stack">
      <PageHeader kicker="Feedback" title="Rate completed service" description="Share service quality notes for completed bookings." />
      <section className="panel narrow">
        {completed.length ? (
          <form className="form-stack" onSubmit={submit}>
            <label className="field">
              <span>Booking</span>
              <select value={form.bookingId} onChange={(event) => setForm({ ...form, bookingId: event.target.value })}>
                {completed.map((booking) => {
                  const details = getDetails(store, booking);
                  return (
                    <option key={booking.id} value={booking.id}>
                      {details.service?.name} - {formatDate(booking.appointmentDate)}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="rating-picker" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={Number(form.rating) >= rating ? "active" : ""}
                  type="button"
                  onClick={() => setForm({ ...form, rating })}
                >
                  <Star size={20} fill="currentColor" />
                </button>
              ))}
            </div>
            <label className="field">
              <span>Comment</span>
              <textarea value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} rows="4" required />
            </label>
            <button className="primary-button" type="submit">
              <MessageSquare size={18} />
              Submit feedback
            </button>
          </form>
        ) : (
          <EmptyState title="No completed services ready for feedback." />
        )}
      </section>
    </div>
  );
}

function ReportsPage({ store }) {
  const statusCounts = bookingStatuses.map((status) => ({
    label: status,
    value: store.bookings.filter((booking) => booking.status === status).length,
  }));
  const maxStatus = Math.max(...statusCounts.map((item) => item.value), 1);
  const serviceCounts = store.services.map((service) => ({
    label: service.name,
    value: store.bookings.filter((booking) => booking.serviceId === service.id).length,
  }));
  const maxService = Math.max(...serviceCounts.map((item) => item.value), 1);
  const totalRevenue = store.invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="page-stack">
      <PageHeader kicker="Reports" title="Workshop analytics" description="Measure booking mix, revenue, and operational workload." />
      <div className="metric-grid">
        <MetricCard icon={ClipboardList} label="Total bookings" value={store.bookings.length} tone="teal" />
        <MetricCard icon={ReceiptText} label="Invoices" value={store.invoices.length} tone="amber" />
        <MetricCard icon={CreditCard} label="Billed amount" value={money(totalRevenue)} tone="green" />
        <MetricCard icon={Star} label="Satisfaction" value={average(store.feedback.map((item) => item.rating)).toFixed(1)} tone="rose" />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <PanelHeader title="Booking status" />
          <BarList items={statusCounts} max={maxStatus} />
        </section>
        <section className="panel span-2">
          <PanelHeader title="Service demand" />
          <BarList items={serviceCounts} max={maxService} />
        </section>
      </div>
    </div>
  );
}

function BookingTable({ store, bookings, actions, interactive = false, compact = false }) {
  if (!bookings.length) return <EmptyState title="No bookings found." />;

  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Booking</th>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Service</th>
            <th>Date</th>
            <th>Status</th>
            {!compact ? <th>Mechanic</th> : null}
            {!compact ? <th>Invoice</th> : null}
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const details = getDetails(store, booking);
            return (
              <tr key={booking.id}>
                <td>
                  <strong>{booking.id}</strong>
                  <span>{booking.priority}</span>
                </td>
                <td>{details.customer?.name}</td>
                <td>
                  <strong>
                    {details.vehicle?.make} {details.vehicle?.model}
                  </strong>
                  <span>{details.vehicle?.plate}</span>
                </td>
                <td>{details.service?.name}</td>
                <td>{formatDate(booking.appointmentDate)}</td>
                <td>
                  {interactive ? (
                    <select
                      className="table-select"
                      value={booking.status}
                      onChange={(event) => actions.updateBooking(booking.id, { status: event.target.value })}
                    >
                      {bookingStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={booking.status} />
                  )}
                </td>
                {!compact ? (
                  <td>
                    {interactive ? (
                      <select
                        className="table-select"
                        value={booking.mechanicId}
                        onChange={(event) => actions.updateBooking(booking.id, { mechanicId: event.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {store.mechanics.map((mechanic) => {
                          const user = store.users.find((item) => item.id === mechanic.userId);
                          return (
                            <option key={mechanic.id} value={mechanic.id}>
                              {user?.name}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      details.mechanicUser?.name || "Unassigned"
                    )}
                  </td>
                ) : null}
                {!compact ? (
                  <td>
                    {details.invoice ? (
                      <StatusBadge status={details.invoice.status} />
                    ) : booking.status === "Completed" ? (
                      <button className="small-button" type="button" onClick={() => actions.generateInvoice(booking.id)}>
                        Generate
                      </button>
                    ) : (
                      <span className="muted-text">Pending</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookingSummary({ store, booking }) {
  const details = getDetails(store, booking);
  return (
    <div className="summary-block">
      <div className="summary-icon">
        <CalendarDays size={24} />
      </div>
      <div>
        <strong>{details.service?.name}</strong>
        <span>
          {details.vehicle?.year} {details.vehicle?.make} {details.vehicle?.model}
        </span>
      </div>
      <dl>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(booking.appointmentDate)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={booking.status} />
          </dd>
        </div>
        <div>
          <dt>Mechanic</dt>
          <dd>{details.mechanicUser?.name || "Unassigned"}</dd>
        </div>
      </dl>
    </div>
  );
}

function PageHeader({ kicker, title, description }) {
  return (
    <div className="page-header">
      <p className="section-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function PanelHeader({ title, actionLabel, actionTo }) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      {actionLabel && actionTo ? (
        <NavLink className="small-link" to={actionTo}>
          {actionLabel}
        </NavLink>
      ) : null}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const className = String(status || "default")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return <span className={`status-badge ${className}`}>{status}</span>;
}

function EmptyState({ title, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <ClipboardList size={24} />
      <strong>{title}</strong>
      {actionLabel && actionTo ? (
        <NavLink className="small-link" to={actionTo}>
          {actionLabel}
        </NavLink>
      ) : null}
    </div>
  );
}

function BarList({ items, max }) {
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <div className="bar-track">
            <span style={{ width: `${Math.max((item.value / max) * 100, item.value ? 10 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
