
import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import WeatherPredictionChart from "@/components/weather/WeatherPredictionChart";
import SimpleWeatherWidget from "../../components/weather/SimpleWeatherWidget";
import MqttLiveWidget from "@/components/mqtt/MqttLiveWidget";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default function Ecommerce() {
  return (
    <AuthGuard>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* <div className="col-span-12 space-y-6 xl:col-span-7">
        <EcommerceMetrics />

        <MonthlySalesChart />
      </div> */}

      {/* <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div>

      <div className="col-span-12">
        <StatisticsChart />
      </div> */}
      {/*<div className="min-h-screen w-full flex flex-col overflow-y-auto overflow-x-hidden">*/}
        <div className="col-span-12">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
            Weather Weekly Prediction
          </h2>
          <WeatherPredictionChart />
        </div>

        <div className="col-span-12">
          <MqttLiveWidget topic="csirreact/feed/live" demo={false} />
        </div>
      {/*</div>*/}

      {/* <div className="col-span-12">
        <SimpleWeatherWidget autoLocate="gps" />
      </div> */}

      {/* <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <RecentOrders />
      </div> */}
      </div>
    </AuthGuard>
  );
}
