import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useSuggestPriceMutation } from "../../state/mlApi";
import { useEffect, useState } from "react";
import type { GetProductsResponse } from "../../state/types";

type SuggestPriceInputItem = {
  price: number;
  expense: number;
  sales_volume: number;
};

type SuggestPriceOutputItem = {
  suggested_price: number;
  predicted_sales: number;
  expected_revenue: number;
};

interface PricingAIProps {
  products: GetProductsResponse[];
}

type TableRow = {
  id: string;
  product_id: string;
  price: number;
  expense: number;
  sales_volume: number;
} & SuggestPriceOutputItem;

const PricingAI: React.FC<PricingAIProps> = ({ products }) => {
  const theme = useTheme();
  const [suggestPrice, { isLoading }] = useSuggestPriceMutation();
  const [productInput, setProductInput] = useState<SuggestPriceInputItem[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);

  useEffect(() => {
    const formatted = products.map((p) => ({
      price: p.price,
      expense: p.expense,
      sales_volume: p.transactions?.length ?? 0,
    }));
    setProductInput(formatted);
  }, [products]);

  useEffect(() => {
    if (productInput.length === 0) return;

    const fetchSuggestions = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await suggestPrice(productInput).unwrap();
      const rows = products.map((product, index) => ({
        id: product._id,
        product_id: product._id,
        price: product.price,
        expense: product.expense,
        sales_volume: product.transactions.length,
        ...result[index],
      }));
      setTableRows(rows);
    };

    fetchSuggestions();
  }, [productInput, products, suggestPrice]);

  const columns: GridColDef[] = [
    { field: "product_id", headerName: "Product ID", flex: 1 },
    { field: "price", headerName: "Price", flex: 0.7 },
    { field: "expense", headerName: "Expense", flex: 0.7 },
    { field: "sales_volume", headerName: "Sales Volume", flex: 0.7 },
    { field: "suggested_price", headerName: "Suggested Price", flex: 1 },
    { field: "predicted_sales", headerName: "Predicted Sales", flex: 1 },
    { field: "expected_revenue", headerName: "Expected Revenue", flex: 1 },
  ];

  return (
    <Box p={2}>
      <Typography variant="h3" mb={2} mt={2}>Product-Wise Pricing Suggestion AI</Typography>
      <Typography variant="body1" color="#64ffda" mb={4}>
        This table provides AI-driven pricing suggestions for each product based on historical sales data, expenses, and current pricing. Optimize your prices to maximize revenue and sales performance.
      </Typography>
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="20rem">
          <CircularProgress />
        </Box>
      ) : (
        <Box
          mt={4}
          height="75vh"
          p="0 0.5rem"
          sx={{
            "& .MuiDataGrid-root": {
              color: theme.palette.grey[300],
              border: "none !important",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${theme.palette.grey[800]} !important`,
            },
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: `1px solid ${theme.palette.grey[800]} !important`,
              backgroundColor: "black",
              color: theme.palette.common.white,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              minHeight: '50px !important',
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 'bold',
              },
            },
            "& .MuiDataGrid-columnSeparator": {
              visibility: "hidden",
            },
            overflow: "auto",
          }}
        >
          <DataGrid
            rows={tableRows}
            columns={columns}
            rowHeight={40}
            columnHeaderHeight={50}
            hideFooter
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
          />
        </Box>

      )}
    </Box>
  );
};

export default PricingAI;
