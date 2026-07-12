import { requirePermission } from "@/lib/auth/guards";
import { t } from "@/lib/i18n/ar";
import { PageHeader } from "@/components/ui";
import { saveItem } from "../actions";
import { ItemForm } from "../item-form";
import { getItemFormOptions } from "../options";

export const metadata = { title: t.inventory.newItem };

export default async function NewItemPage() {
  await requirePermission("inventory.manageItems");
  const { categories, units, suppliers } = await getItemFormOptions();

  return (
    <div>
      <PageHeader title={t.inventory.newItem} />
      <ItemForm
        action={saveItem.bind(null, null)}
        categories={categories}
        units={units}
        suppliers={suppliers}
      />
    </div>
  );
}
