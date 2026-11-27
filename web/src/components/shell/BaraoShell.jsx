import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/i18n';

/**
 * Shell reutilizável do Barão construído sobre os componentes oficiais do shadcn/ui (Sidebar + Base UI).
 */
export function BaraoShell({
  brandTitle = t('common.brand.title'),
  brandSubtitle = t('common.brand.subtitle'),
  groupLabel = t('common.brand.groupLabel'),
  navItems = [],
  activeTab,
  onTabChange,
  footer,
  headerTitle,
  headerSubtitle,
  headerActions,
  children
}) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="no-print">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-2.5 px-1">
            <img
              src="/barao-logo.jpg"
              alt={brandTitle}
              className="size-8 shrink-0 rounded-lg object-cover ring-1 ring-border"
            />
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{brandTitle}</span>
              <span className="truncate text-xs text-muted-foreground">{brandSubtitle}</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        onClick={() => onTabChange(item.id)}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.count !== undefined && (
                        <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {footer && (
          <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
            {footer}
          </SidebarFooter>
        )}
      </Sidebar>

      <SidebarInset className="flex h-svh flex-col overflow-hidden bg-background">
        <header className="no-print z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <div className="flex min-w-0 items-baseline gap-2.5">
              <h1 className="truncate text-sm font-semibold tracking-tight">{headerTitle}</h1>
              {headerSubtitle && (
                <p className="hidden truncate text-xs text-muted-foreground md:block">{headerSubtitle}</p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          )}
        </header>

        <ScrollArea className="min-h-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0">
          <main className="min-w-0 p-5 sm:p-6 lg:p-8">
            <div className="mx-auto min-w-0 max-w-6xl space-y-6">{children}</div>
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
