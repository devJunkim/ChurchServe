using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ChurchServe.Api.Authentication;

public static class SessionEndpoints
{
  public static RouteGroupBuilder MapSessionEndpoints(this IEndpointRouteBuilder endpoints)
  {
    var group = endpoints.MapGroup("/api/session");

    group.MapGet("/", (HttpContext context, IAntiforgery antiforgery) =>
    {
      IssueAntiforgeryToken(context, antiforgery);
      return context.User.Identity?.IsAuthenticated == true
          ? Results.Ok(ToResponse(context.User))
          : Results.Unauthorized();
    });

    group.MapPost("/sign-in", async (
        SignInRequest request,
        HttpContext context,
        IAntiforgery antiforgery,
        LocalAccountAuthenticator authenticator) =>
    {
      if (!await IsAntiforgeryRequestValid(context, antiforgery))
      {
        return Results.BadRequest(new { message = "The antiforgery token was invalid." });
      }

      if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
      {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
          ["credentials"] = ["Email and password are required."],
        });
      }

      var account = authenticator.Authenticate(request.Email, request.Password);
      if (account is null)
      {
        return Results.Json(
            new { message = "The email or password was incorrect." },
            statusCode: StatusCodes.Status401Unauthorized);
      }

      var claims = new[]
      {
        new Claim(ClaimTypes.NameIdentifier, account.Id),
        new Claim(ClaimTypes.Name, account.DisplayName),
        new Claim(ClaimTypes.Email, account.Email),
        new Claim(ClaimTypes.Role, account.Role),
      };
      var principal = new ClaimsPrincipal(
          new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));

      await context.SignInAsync(
          CookieAuthenticationDefaults.AuthenticationScheme,
          principal,
          new AuthenticationProperties { IsPersistent = false });
      context.User = principal;
      IssueAntiforgeryToken(context, antiforgery);

      return Results.Ok(ToResponse(principal));
    });

    group.MapDelete("/", async (HttpContext context, IAntiforgery antiforgery) =>
    {
      if (!await IsAntiforgeryRequestValid(context, antiforgery))
      {
        return Results.BadRequest(new { message = "The antiforgery token was invalid." });
      }

      await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
      context.User = new ClaimsPrincipal(new ClaimsIdentity());
      IssueAntiforgeryToken(context, antiforgery);
      return Results.NoContent();
    }).RequireAuthorization();

    return group;
  }

  private static async Task<bool> IsAntiforgeryRequestValid(
      HttpContext context,
      IAntiforgery antiforgery)
  {
    try
    {
      await antiforgery.ValidateRequestAsync(context);
      return true;
    }
    catch (AntiforgeryValidationException)
    {
      return false;
    }
  }

  private static void IssueAntiforgeryToken(HttpContext context, IAntiforgery antiforgery)
  {
    var tokens = antiforgery.GetAndStoreTokens(context);
    context.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
    {
      HttpOnly = false,
      IsEssential = true,
      SameSite = SameSiteMode.Strict,
      Secure = context.Request.IsHttps,
      Path = "/",
    });
  }

  private static SessionUserResponse ToResponse(ClaimsPrincipal principal) =>
      new(
          principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
          principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty,
          principal.Identity?.Name ?? string.Empty,
          principal.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray());
}
