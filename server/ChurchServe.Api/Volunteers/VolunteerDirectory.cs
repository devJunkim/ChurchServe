using ChurchServe.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Volunteers;

public sealed class VolunteerDirectory(ChurchServeDbContext dbContext)
{
  public async Task<IReadOnlyList<VolunteerResponse>> SearchAsync(
      string query,
      CancellationToken cancellationToken)
  {
    var pattern = $"%{EscapeLikePattern(query)}%";
    return await dbContext.Volunteers
        .AsNoTracking()
        .Where(volunteer => EF.Functions.Like(volunteer.DisplayName, pattern, "\\"))
        .OrderBy(volunteer => volunteer.DisplayName)
        .Take(20)
        .Select(volunteer => new VolunteerResponse(
            volunteer.Id,
            volunteer.DisplayName,
            volunteer.EligibleMinistries
                .OrderBy(eligibility => eligibility.Ministry)
                .Select(eligibility => eligibility.Ministry)
                .ToArray()))
        .ToArrayAsync(cancellationToken);
  }

  private static string EscapeLikePattern(string value) => value
      .Replace("\\", "\\\\", StringComparison.Ordinal)
      .Replace("%", "\\%", StringComparison.Ordinal)
      .Replace("_", "\\_", StringComparison.Ordinal);
}
