import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, tap } from 'rxjs';
import { CategoryDetails, CategoryWrite } from '../../../../core/api/generated';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { focusFirstInvalid, lengthRule, nameRules } from '../../../../shared/forms/validation';
import { CategoriesService } from '../../../../shared/services/categories.service';
import { CheckboxField } from '../../../../shared/ui/checkbox-field/checkbox-field';
import { ImageField } from '../../../../shared/ui/image-field/image-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { TextareaField } from '../../../../shared/ui/textarea-field/textarea-field';
import { ArchiveButton } from '../../components/archive-button';

interface CategoryModel {
  name: string;
  description: string;
  isActive: boolean;
}

const toModel = (category: CategoryDetails | undefined): CategoryModel => ({
  name: category?.name ?? '',
  description: category?.description ?? '',
  isActive: category?.isActive ?? true,
});

const toWrite = (model: CategoryModel): CategoryWrite => ({
  name: model.name.trim(),
  description: model.description.trim() || null,
  isActive: model.isActive,
});

/** Création (`/nouvelle`) ou modification (`/:id`) d'une catégorie. */
@Component({
  selector: 'app-category-edit-page',
  imports: [RouterLink, TextField, TextareaField, CheckboxField, ImageField, ArchiveButton],
  templateUrl: './category-edit-page.html',
})
export class CategoryEditPage {
  /** Paramètre de route ; absent pour une création. */
  readonly id = input<string>();

  private readonly categories = inject(CategoriesService);
  private readonly router = inject(Router);

  protected readonly category = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.categories.get(id),
  });
  protected readonly notFound = computed(
    () => !!this.id() && this.category.hasValue() && !this.category.value(),
  );
  protected readonly loadError = computed(() =>
    this.category.error() ? apiErrorMessage(this.category.error()) : '',
  );
  protected readonly archived = computed(() => this.category.value()?.isArchived ?? false);
  protected readonly imageUrl = linkedSignal(() => this.category.value()?.imageUrl);

  protected readonly model = linkedSignal(() => toModel(this.category.value()));
  protected readonly form = form(this.model, (path) => {
    nameRules(path.name);
    lengthRule(path.description, 1000);
  });
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly archiving = signal(false);

  protected readonly uploadImage = (file: File) =>
    this.categories
      .uploadImage(this.id()!, file)
      .pipe(tap((category) => this.imageUrl.set(category.imageUrl)));

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.notice.set('');
    await submit(this.form, {
      action: async () => {
        const id = this.id();
        try {
          if (id) {
            this.category.set(
              await firstValueFrom(this.categories.update(id, toWrite(this.model()))),
            );
            this.notice.set($localize`:@@sheet.saved:Modifications enregistrées.`);
          } else {
            const created = await firstValueFrom(this.categories.create(toWrite(this.model())));
            await this.router.navigate(['/gestion/categories', created.id], { replaceUrl: true });
          }
        } catch (error) {
          this.error.set(apiErrorMessage(error));
        }
        return undefined;
      },
      onInvalid: (tree) => focusFirstInvalid(tree),
    });
  }

  protected async archive(): Promise<void> {
    this.error.set('');
    this.archiving.set(true);
    try {
      await firstValueFrom(this.categories.remove(this.id()!));
      await this.router.navigate(['/gestion/categories']);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.archiving.set(false);
    }
  }
}
