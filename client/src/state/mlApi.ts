import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const mlApi = createApi({
    reducerPath: "mlApi",
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_ML_BASE_URL }),
    endpoints: (build) => ({
        suggestPrice: build.mutation<{ suggested_price: number; predicted_sales: number; expected_revenue: number }[], { price: number; expense: number; sales_volume: number }[]>({
            query: (body) => ({
                url: "/suggest-price",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useSuggestPriceMutation
} = mlApi;
