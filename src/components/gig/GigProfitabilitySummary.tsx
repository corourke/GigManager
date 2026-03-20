import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';
import { DollarSign, TrendingUp, TrendingDown, Users, Receipt, FileText } from 'lucide-react';

interface GigProfitabilitySummaryProps {
  summary: {
    contractAmount: number;
    received: number;
    outstandingRevenue: number;
    actualCosts: number;
    projectedStaffCosts: number;
    totalCosts: number;
    profit: number;
    margin: number;
  };
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const GigProfitabilitySummary: React.FC<GigProfitabilitySummaryProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-48 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const {
    contractAmount,
    received,
    outstandingRevenue,
    actualCosts,
    projectedStaffCosts,
    totalCosts,
    profit,
    margin,
  } = summary;

  // Contract card colors
  const contractCardColor = contractAmount === 0 
    ? 'border-gray-200' 
    : received >= contractAmount 
      ? 'border-green-500 bg-green-50/30' 
      : 'border-amber-500 bg-amber-50/30';

  // Profit card colors
  const profitCardColor = profit === 0
    ? 'border-gray-200'
    : profit > 0
      ? 'border-green-500 bg-green-50/30'
      : 'border-red-500 bg-red-50/30';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Contract Card */}
      <Card className={cn("border-l-4 transition-all", contractCardColor)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Contract
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(contractAmount)}</div>
          <div className="flex flex-col mt-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Received:</span>
              <span className="font-medium text-foreground">{formatCurrency(received)}</span>
            </div>
            <div className="flex justify-between">
              <span>Outstanding:</span>
              <span className={cn("font-medium", outstandingRevenue > 0 ? "text-amber-600" : "text-green-600")}>
                {formatCurrency(outstandingRevenue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Costs Card */}
      <Card className="border-l-4 border-blue-500 bg-blue-50/30 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Total Costs
          </CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
          <div className="flex flex-col mt-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Actual:</span>
              <span className="font-medium text-foreground">{formatCurrency(actualCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span>Projected Staff:</span>
              <span className="font-medium text-foreground">{formatCurrency(projectedStaffCosts)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Card */}
      <Card className={cn("border-l-4 transition-all", profitCardColor)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {profit >= 0 ? 'Projected Profit' : 'Projected Loss'}
          </CardTitle>
          {profit >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", profit > 0 ? "text-green-700" : profit < 0 ? "text-red-700" : "")}>
            {formatCurrency(profit)}
          </div>
          <div className="flex flex-col mt-1 text-xs text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Margin:</span>
              <span className={cn(
                "font-bold px-1.5 py-0.5 rounded text-[10px]",
                profit > 0 ? "bg-green-100 text-green-700" : profit < 0 ? "bg-red-100 text-red-700" : "bg-gray-100"
              )}>
                {margin.toFixed(1)}%
              </span>
            </div>
            <div className="h-1 mt-1.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GigProfitabilitySummary;
