using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.Data;
using ChurchServe.Api.Volunteers;
using Microsoft.Extensions.DependencyInjection;

namespace ChurchServe.Api.Tests;

public sealed class VolunteerEndpointsTests
{
  [Fact]
  public async Task Search_returns_case_insensitive_name_matches()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/volunteers?query=ANN");
    var volunteers = await response.Content.ReadFromJsonAsync<VolunteerResponse[]>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(volunteers);
    Assert.Equal(["Anna Brooks", "Annette Lee"], volunteers.Select(item => item.DisplayName));
  }

  [Fact]
  public async Task Search_trims_the_query_and_returns_sorted_ministries()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var volunteers = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=%20ALEX%20");

    var volunteer = Assert.Single(volunteers!);
    Assert.Equal("alex-morgan", volunteer.Id);
    Assert.Equal(["technical", "worship"], volunteer.EligibleMinistries);
  }

  [Theory]
  [InlineData("")]
  [InlineData("a")]
  [InlineData("%20")]
  public async Task Search_returns_an_empty_list_for_short_queries(string query)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var volunteers = await client.GetFromJsonAsync<VolunteerResponse[]>(
        $"/api/volunteers?query={query}");

    Assert.NotNull(volunteers);
    Assert.Empty(volunteers);
  }

  [Fact]
  public async Task Search_treats_like_wildcards_as_literal_text()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var volunteers = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=%25%25");

    Assert.NotNull(volunteers);
    Assert.Empty(volunteers);
  }

  [Fact]
  public async Task Search_treats_underscore_and_backslash_as_literal_text()
  {
    using var factory = new ChurchServeApiFactory();
    await AddVolunteerAsync(factory, "special", "Pat_\\Lee", "welcome");
    using var client = await factory.CreateAuthenticatedClientAsync();

    var underscoreMatches = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=Pat_%5C");
    var backslashMatches = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=%5CLee");

    Assert.Equal("special", Assert.Single(underscoreMatches!).Id);
    Assert.Equal("special", Assert.Single(backslashMatches!).Id);
  }

  [Fact]
  public async Task Search_returns_no_more_than_twenty_results_in_name_order()
  {
    using var factory = new ChurchServeApiFactory();
    await using (var scope = factory.Services.CreateAsyncScope())
    {
      var dbContext = scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>();
      for (var index = 24; index >= 0; index--)
      {
        dbContext.Volunteers.Add(new Volunteer
        {
          Id = $"search-{index:00}",
          DisplayName = $"Search Person {index:00}",
        });
      }

      await dbContext.SaveChangesAsync();
    }
    using var client = await factory.CreateAuthenticatedClientAsync();

    var volunteers = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=Search");

    Assert.NotNull(volunteers);
    Assert.Equal(20, volunteers.Length);
    Assert.Equal("Search Person 00", volunteers[0].DisplayName);
    Assert.Equal("Search Person 19", volunteers[^1].DisplayName);
  }

  [Fact]
  public async Task Search_returns_an_empty_list_when_no_names_match()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var volunteers = await client.GetFromJsonAsync<VolunteerResponse[]>(
        "/api/volunteers?query=Nobody");

    Assert.Empty(volunteers!);
  }

  [Fact]
  public async Task Search_requires_authentication()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/volunteers?query=Alex");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  private static async Task AddVolunteerAsync(
      ChurchServeApiFactory factory,
      string id,
      string displayName,
      params string[] ministries)
  {
    await using var scope = factory.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>();
    var volunteer = new Volunteer { Id = id, DisplayName = displayName };
    foreach (var ministry in ministries)
    {
      volunteer.EligibleMinistries.Add(new VolunteerMinistry
      {
        VolunteerId = id,
        Ministry = ministry,
      });
    }

    dbContext.Volunteers.Add(volunteer);
    await dbContext.SaveChangesAsync();
  }
}
