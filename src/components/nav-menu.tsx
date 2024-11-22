'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

export function NavMenu() {
  const pathname = usePathname()
  
  const items = [
    { href: "/", label: "Meals" },
    { href: "/history", label: "History" },
    { href: "/settings", label: "Settings" },
  ]

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {items.map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <NavigationMenuLink 
                className={cn(
                  navigationMenuTriggerStyle(),
                  pathname === item.href && "bg-accent"
                )}
              >
                {item.label}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
} 