"use client";

import {
  ArrowLeftRight,
  Barcode,
  BookUser,
  Captions,
  Coins,
  Layers,
  ListCheck,
  Map,
  Menu,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MeshLogo from "@/public/MeshLogo.png";

export default function Sidenav() {
  const [open, setOpen] = useState(false);

  const pathname = usePathname().split("/");

  const links = [
    { name: "Product", path: "/product", icon: <Barcode /> },
    { name: "Location", path: "/location", icon: <Map /> },
    { name: "Warehouse", path: "/warehouse", icon: <Warehouse /> },
    { name: "Inventory", path: "/inventory", icon: <Layers /> },
    { name: "Costumer", path: "/constumer", icon: <Users /> },
    { name: "Delivery", path: "/delivery", icon: <Truck /> },
    { name: "Provider", path: "/provider", icon: <BookUser /> },
    { name: "Order", path: "/order", icon: <ListCheck /> },
    { name: "Transfer", path: "/transfer", icon: <ArrowLeftRight /> },
    { name: "Payment", path: "/payment", icon: <Coins /> },
    { name: "Transaction", path: "/transaction", icon: <Captions /> },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center p-2 mt-2 ms-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 `}
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <Menu />
        </svg>
      </button>
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform  sm:${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="h-full px-3 py-4 overflow-y-auto bg-meshBlue dark:bg-gray-800 text-gray-100">
          <Link href="/" className="flex items-center ps-2.5 mb-5">
            <Image
              src={MeshLogo}
              width={24}
              height={24}
              className="h-6 me-3 sm:h-7"
              alt=""
            />
            <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
              Mesh
            </span>
          </Link>
          <ul className="space-y-2 font-medium mt-3">
            {links.map((link, index) => {
              const active = pathname.includes(link.name.toLowerCase());
              return (
                <li key={index}>
                  <Link
                    href={"/dashboard" + link.path}
                    className={
                      active
                        ? "flex items-center p-2 bg-gray-100 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                        : "flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
                    }
                  >
                    <span
                      className={
                        active
                          ? "w-3 h-3 text-gray-900 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white mb-3"
                          : "w-3 h-3 text-gray-300 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white mb-3"
                      }
                    >
                      {link.icon}
                    </span>
                    <span
                      className={
                        active
                          ? "ms-5 text-gray-900 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                          : "ms-5 text-gray-300 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                      }
                    >
                      {link.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
