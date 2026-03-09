import { google } from "googleapis";
import { GA4Data, GA4Period } from "@/types/ga4";

function getGA4Auth() {
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
	const privateKey = process.env.GOOGLE_PRIVATE_KEY;
	if (!email || !privateKey) {
		throw new Error(
			"GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set.",
		);
	}
	return new google.auth.JWT({
		email,
		key: privateKey.replace(/\\n/g, "\n"),
		scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
	});
}

function toDateRanges(
	period: GA4Period,
): [
	{ startDate: string; endDate: string },
	{ startDate: string; endDate: string },
] {
	if (period === "7d") {
		return [
			{ startDate: "7daysAgo", endDate: "yesterday" },
			{ startDate: "14daysAgo", endDate: "8daysAgo" },
		];
	}
	if (period === "30d") {
		return [
			{ startDate: "30daysAgo", endDate: "yesterday" },
			{ startDate: "60daysAgo", endDate: "31daysAgo" },
		];
	}
	if (period === "90d") {
		return [
			{ startDate: "90daysAgo", endDate: "yesterday" },
			{ startDate: "180daysAgo", endDate: "91daysAgo" },
		];
	}
	// FY: April 1 of current fiscal year to today
	const today = new Date();
	const month = today.getMonth(); // 0-based
	const year = today.getFullYear();
	const fyStartYear = month < 3 ? year - 1 : year;
	return [
		{ startDate: `${fyStartYear}-04-01`, endDate: "yesterday" },
		{
			startDate: `${fyStartYear - 1}-04-01`,
			endDate: `${fyStartYear}-03-31`,
		},
	];
}

function emptyGA4Data(): GA4Data {
	return {
		summary: {
			sessions: 0,
			users: 0,
			keyEvents: 0,
			prevSessions: 0,
			prevUsers: 0,
			prevKeyEvents: 0,
		},
		channels: [],
		daily: [],
		devices: [],
	};
}

export async function fetchGA4Data(
	period: GA4Period = "30d",
): Promise<GA4Data> {
	const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
	if (!propertyId) {
		console.warn("GOOGLE_ANALYTICS_PROPERTY_ID is not set.");
		return emptyGA4Data();
	}

	const auth = getGA4Auth();
	const analyticsdata = google.analyticsdata({ version: "v1beta", auth });
	const property = `properties/${propertyId}`;
	const [currentRange, prevRange] = toDateRanges(period);

	try {
		const [channelRes, dailyRes, deviceRes, prevRes] = await Promise.all([
			// Channel breakdown
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges: [currentRange],
					dimensions: [{ name: "sessionDefaultChannelGroup" }],
					metrics: [
						{ name: "sessions" },
						{ name: "activeUsers" },
						{ name: "keyEvents" },
					],
					orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
				},
			}),
			// Daily sessions
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges: [currentRange],
					dimensions: [{ name: "date" }],
					metrics: [{ name: "sessions" }, { name: "keyEvents" }],
					orderBys: [{ dimension: { dimensionName: "date" } }],
				},
			}),
			// Device category
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges: [currentRange],
					dimensions: [{ name: "deviceCategory" }],
					metrics: [{ name: "sessions" }],
					orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
				},
			}),
			// Previous period totals
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges: [prevRange],
					metrics: [
						{ name: "sessions" },
						{ name: "activeUsers" },
						{ name: "keyEvents" },
					],
				},
			}),
		]);

		const channels = (channelRes.data.rows || []).map((row) => ({
			channel: row.dimensionValues?.[0]?.value || "Unknown",
			sessions: parseInt(row.metricValues?.[0]?.value || "0"),
			users: parseInt(row.metricValues?.[1]?.value || "0"),
			keyEvents: parseInt(row.metricValues?.[2]?.value || "0"),
		}));

		const daily = (dailyRes.data.rows || []).map((row) => ({
			date: row.dimensionValues?.[0]?.value || "",
			sessions: parseInt(row.metricValues?.[0]?.value || "0"),
			keyEvents: parseInt(row.metricValues?.[1]?.value || "0"),
		}));

		const devices = (deviceRes.data.rows || []).map((row) => ({
			device: row.dimensionValues?.[0]?.value || "Unknown",
			sessions: parseInt(row.metricValues?.[0]?.value || "0"),
		}));

		const totals = channelRes.data.totals?.[0];
		const sessions = parseInt(totals?.metricValues?.[0]?.value || "0");
		const users = parseInt(totals?.metricValues?.[1]?.value || "0");
		const keyEvents = parseInt(totals?.metricValues?.[2]?.value || "0");

		const prevTotals = prevRes.data.totals?.[0];
		const prevSessions = parseInt(prevTotals?.metricValues?.[0]?.value || "0");
		const prevUsers = parseInt(prevTotals?.metricValues?.[1]?.value || "0");
		const prevKeyEvents = parseInt(prevTotals?.metricValues?.[2]?.value || "0");

		return {
			summary: {
				sessions,
				users,
				keyEvents,
				prevSessions,
				prevUsers,
				prevKeyEvents,
			},
			channels,
			daily,
			devices,
		};
	} catch (e) {
		console.error("GA4 fetch error:", e);
		return emptyGA4Data();
	}
}
