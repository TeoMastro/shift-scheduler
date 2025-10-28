import { Award, Building2, Calendar, Clock, Home, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { NavUser } from '@/components/layout/nav-user';
import { auth } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { PrivacyPolicyDialog } from '@/components/legal/privacy-policy-dialog';
import { TermsDialog } from '@/components/legal/terms-dialog';

export async function AppSidebar() {
  const session = await auth();
  const t = await getTranslations('app');

  const userData = {
    name: session?.user.name || 'User',
    email: session?.user.email || 'user@example.com',
    avatar: '', // TODO: include the icon if
  };

  const items = [
    {
      title: t('home'),
      url: '/dashboard',
      icon: Home,
    },
    ...(session?.user.role === 'ADMIN'
      ? [
          {
            title: t('users'),
            url: '/admin/user',
            icon: Users,
          },
          {
            title: t('companies'),
            url: '/admin/company',
            icon: Building2,
          },
        ]
      : []),
    ...(session?.user.role === 'MANAGER'
      ? [
          {
            title: t('users'),
            url: '/admin/user',
            icon: Users,
          },
        ]
      : []),
    ...(session?.user.role === 'ADMIN' || session?.user.role === 'MANAGER'
      ? [
          {
            title: t('shiftTypes'),
            url: '/shift-type',
            icon: Clock,
          },
        ]
      : []),
    ...(session?.user.role === 'MANAGER'
      ? [
          {
            title: t('shifts'),
            url: '/shift',
            icon: Calendar,
          },
          {
            title: t('skills'),
            url: '/skill',
            icon: Award,
          },
        ]
      : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {/* App Logo Placeholder */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NL</span>
          </div>
          {/* App Title */}
          <h2 className="text-lg font-semibold text-foreground">
            Next Launch Kit
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Legal Documents as Dialogs */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PrivacyPolicyDialog title={t('privacyPolicy')} />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <TermsDialog title={t('termsOfService')} />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
