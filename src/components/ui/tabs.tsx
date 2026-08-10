import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // شريط التبويب كان `inline-flex` بعرض محتواه وبلا مخرج: خمسة تبويبات
      // على ٣٧٥px تعطي ٤٤٤px، و`<main>` يحمل `overflow-x-hidden` — فتبويب
      // «Events» يقع كاملًا خارج الشاشة (٣٧٩–٤٥٦) **بلا شريط تمرير يبلغه**.
      // `max-w-full` تحبس الشريط في عرض أبيه، و`overflow-x-auto` تحوّل
      // الفائض من مقصوصٍ إلى مبلوغٍ بالسحب.
      "inline-flex max-w-full items-center justify-center overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground",
      // و`h-9` (٣٦px) كانت تناقض أرضية اللمس: التبويب نفسه ٤٤px بقاعدة عامة،
      // فكان يبرز ٤px فوق حبّة الشريط وتحتها. `min-h-9` تحفظ المظهر حين
      // يكفي الارتفاع وتترك الحبّة تنمو لتحتوي هدفًا مطابقًا للأرضية.
      "min-h-9",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // `shrink-0` داخل شريطٍ يُمرَّر: بلا هذا يضغط الفليكس التبويبات لتُقحم
      // في العرض المتاح فيضيع حشوها، والمقصود أن تحتفظ بمقاسها ويُمرَّر الشريط.
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-[background-color,color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
