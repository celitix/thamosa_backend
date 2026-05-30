import { errorHandler, responseHandler } from "../lib/helper";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { unlink } from "node:fs/promises";
import path from "node:path";

const create = async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      shortDesc,
      content,
      category,
      tags,
      publishedDate,
      seo,
      status,
    } = req.body;

    if (!req.file) {
      return responseHandler(
        res,
        { message: "No file uploaded", status: false },
        201,
      );
    }

    const isBlogExist = await prisma.blog.findUnique({ where: { slug } });

    if (isBlogExist) {
      return responseHandler(
        res,
        { message: "Blog already exist", status: false },
        201,
      );
    }

    prisma.$transaction(async (tx) => {
      const seoData = await tx.seo.create({
        data: {
          title: seo.title,
          description: seo.desc,
          keywords: seo.keywords,
        },
      });
      await tx.blog.create({
        data: {
          title,
          slug,
          shortDesc,
          content,
          category,
          tags,
          publishedDate,
          seoId: seoData.id,
          status: status.toUpperCase(),
          image: req.file!.path,
        },
      });
    });
    return responseHandler(
      res,
      { message: "Blog created successfully", status: true },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const all = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const orderBy = (req.query.orderBy as string) || "desc";
    const type = (req.query.type as string) || "all";
    const role = (req.query.role as string) || "non-admin";

    let where = {};
    if (type == "published") {
      where = {
        status: "PUBLISHED",
      };
    }

    if (type == "draft") {
      where = {
        status: "DRAFT",
      };
    }

    const recentBlogs = await prisma.blog.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        shortDesc: true,
        category: true,
        publishedDate: true,
        image: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 2,
    });

    let whereNot = {};

    if (role !== "admin") {
      whereNot = {
        id: {
          notIn: recentBlogs.map((b) => b.id),
        },
      };
    }

    const blogs = await prisma.blog.findMany({
      where: {
        ...where,
        ...whereNot,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDesc: true,
        category: true,
        publishedDate: true,
        image: true,
        status: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: orderBy === "asc" ? "asc" : "desc",
      },
    });

    const totalBlogLength = await prisma.blog.count({
      where,
    });

    return responseHandler(
      res,
      {
        message: "Blogs fetched successfully",
        status: true,
        blogs,
        recentBlogs,
        meta: {
          total: totalBlogLength,
          totalPages: Math.ceil(totalBlogLength / limit),
          currentPage: page,
          limit,
        },
      },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const byId = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;

    const id = typeof idParam === "string" ? idParam : undefined;

    if (!id) {
      return responseHandler(
        res,
        { message: "Slug is required", status: false },
        400,
      );
    }

    const isBlogExist = await prisma.blog.findUnique({
      where: { slug: id },
      include: {
        seo: {
          select: {
            id: true,
            title: true,
            description: true,
            keywords: true,
          },
        },
      },
    });

    if (!isBlogExist) {
      return responseHandler(
        res,
        { message: "Blog not found", status: false },
        400,
      );
    }
    return responseHandler(
      res,
      { message: "Blog fetched successfully", status: true, blog: isBlogExist },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const update = async (req: Request, res: Response) => {
  try {
    const { id: slug, seo, ...rest } = req.body;

    const isBlogExist = await prisma.blog.findUnique({ where: { slug } });

    if (!isBlogExist) {
      return responseHandler(
        res,
        { message: "Blog not found", status: false },
        400,
      );
    }

    if (rest.slug && rest.slug !== slug) {
      const isSlugTaken = await prisma.blog.findUnique({
        where: { slug: rest.slug },
      });
      if (isSlugTaken) {
        return responseHandler(
          res,
          { message: "Slug is already in use by another blog", status: false },
          400,
        );
      }
    }

    const oldImagePath = isBlogExist.image;
    const newImagePath =
      req.file?.path && req.file.path !== oldImagePath
        ? req.file.path
        : oldImagePath;
    const shouldUpdateSeo = seo !== undefined && Object.keys(seo).length > 0;
    const seoId = seo?.id || isBlogExist.seoId;

    if (shouldUpdateSeo && seo?.id && seo.id !== isBlogExist.seoId) {
      return responseHandler(
        res,
        { message: "SEO does not belong to this blog", status: false },
        400,
      );
    }

    if (shouldUpdateSeo && !seoId) {
      return responseHandler(
        res,
        { message: "Seo id is required", status: false },
        400,
      );
    }

    const isUpdate = await prisma.$transaction(async (tx) => {
      if (shouldUpdateSeo) {
        await tx.seo.update({
          where: {
            id: seoId,
          },
          data: {
            title: seo.title,
            description: seo.desc,
            keywords: seo.keywords,
          },
        });
      }

      const isUpdate = await tx.blog.update({
        where: {
          slug,
        },
        data: {
          ...rest,
          image: newImagePath,
          status: rest?.status?.toUpperCase(),
        },
      });
      return isUpdate;
    });
    if (!isUpdate) {
      return responseHandler(
        res,
        { message: "Something went wrong", status: false },
        400,
      );
    }
    if (newImagePath !== oldImagePath) {
      await deleteFile(oldImagePath);
    }
    return responseHandler(
      res,
      { message: "Blog updated successfully", status: true },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};

const deleteB = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;

    if (typeof id !== "string") {
      return responseHandler(
        res,
        { message: "Blog id is required", status: false },
        400,
      );
    }

    const isBlogExist = await prisma.blog.findUnique({ where: { id } });

    if (!isBlogExist) {
      return responseHandler(
        res,
        { message: "Blog not found", status: false },
        400,
      );
    }

    const isDelete = await prisma.blog.delete({
      where: {
        id,
      },
    });

    await deleteFile(isBlogExist.image);

    if (!isDelete) {
      return responseHandler(
        res,
        { message: "Something went wrong", status: false },
        400,
      );
    }
    return responseHandler(
      res,
      { message: "Blog deleted successfully", status: true },
      201,
    );
  } catch (e: any) {
    errorHandler(e.message);
  }
};
async function deleteFile(filePath: string) {
  try {
    const resolvedPath = path.resolve(filePath);
    const uploadsDir = path.resolve(process.cwd(), "uploads");

    if (!resolvedPath.startsWith(`${uploadsDir}${path.sep}`)) {
      return;
    }

    await unlink(resolvedPath);
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      console.error("Failed to delete file:", e.message);
    }
  }
}
export { create, all, byId, update, deleteB };
