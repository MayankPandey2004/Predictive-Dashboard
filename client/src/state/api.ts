import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { GetKpisResponse, GetProductsResponse, GetTransactionsResponse } from "./types";


export const api = createApi({
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BASE_URL }),
    reducerPath: "main",
    tagTypes: ["Kpis", "Products", "Transactions"],
    endpoints: (build) => ({
        getKpis: build.query<Array<GetKpisResponse>, void>({
            query: () => "kpi/kpis/",
            providesTags: ["Kpis"]
        }),
        getProducts: build.query<Array<GetProductsResponse>, void>({
            query: () => "product/products/",
            providesTags: ["Products"]
        }),
        getTransactions: build.query<Array<GetTransactionsResponse>, void>({
            query: () => "transaction/transactions/",
            providesTags: ["Transactions"]
        }),
        // suggestPrice: build.mutation<{ suggested_price: number; predicted_sales: number; expected_revenue: number }, { price: number; expense: number; sales_volume: number }[]>({
        //     query: (body) => ({
        //         url: import.meta.env.ML_BASE_URL,
        //         method: "POST",
        //         body,
        //     }),
        // }),
    })
})

export const {
    useGetKpisQuery,
    useGetProductsQuery,
    useGetTransactionsQuery,
} = api; 