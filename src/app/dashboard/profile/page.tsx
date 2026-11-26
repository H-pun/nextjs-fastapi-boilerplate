"use client";

import { useSession } from "next-auth/react";

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

import { AvatarUpload } from "./_components/avatar-upload";
import ProfileForm from "./_components/profile-form";
import PasswordForm from "./_components/password-form";

export default function AdminProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) {
    return (
      <div className="mx-auto my-auto">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="size-8" />
          <p className="text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const avatarSrc = user.avatar
    ? `/api/server/preview?filename=${user.avatar}`
    : undefined;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your personal information and settings"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center">
                <AvatarUpload name={user.name} avatarSrc={avatarSrc} />
                <CardTitle className="mt-4 text-center">{user.name}</CardTitle>
                <CardDescription className="text-center">
                  {user.identifier}
                </CardDescription>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {user.roles?.map((role) => (
                    <Badge key={role.id} variant="secondary" className="capitalize">
                      {role.name.toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Right: Tabs + Forms */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Update your profile and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Basic Profile</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                  <ProfileForm />
                </TabsContent>

                <TabsContent value="security" className="mt-6">
                  <PasswordForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
