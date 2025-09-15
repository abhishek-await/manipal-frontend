"use client";

import Image from "next/image";
import React from "react";

export default function HeaderMenu() {
  function onOpenMenu() {
    // replace with your actual menu toggle logic
    console.log("open menu");
  }

  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={onOpenMenu}
      className="h-10 w-10 rounded-md flex items-center justify-center hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
    >
      <img src="/List.svg" alt="" className="w-6 h-6 object-contain" />
    </button>
  );
}
