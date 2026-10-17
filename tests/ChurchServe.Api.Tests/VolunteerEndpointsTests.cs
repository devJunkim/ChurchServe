using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.Volunteers;

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
}
