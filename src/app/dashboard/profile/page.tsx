"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import AvatarDialog from "./_components/avatar-dialog";
import ProfileForm from "./_components/profile-form";
import PasswordForm from "./_components/password-form";

import { getInitials } from "@/lib/utils";

import { Camera, Loader2 } from "lucide-react";

export default function AdminProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto my-auto">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const avatarSrc = user.avatar
    ? `/api/server/preview?filename=${user.avatar}`
    : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl font-semibold capitalize tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and settings
        </p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center">
                <div
                  className="group relative cursor-pointer"
                  onClick={() => setAvatarDialogOpen(true)}
                >
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarSrc} alt={user.name} />
                    <AvatarFallback className="bg-red-100 text-2xl text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className="mt-4 text-center">{user.name}</CardTitle>
                <CardDescription className="text-center">
                  {user.identifier}
                </CardDescription>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium capitalize text-red-800 dark:bg-red-900 dark:text-red-200">
                    {user.role.toLowerCase()}
                  </span>
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

      <AvatarDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
      />
    </div>
  );
}
