using ChurchServe.Api.ServiceEvents;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public sealed class ChurchServeDbContext(DbContextOptions<ChurchServeDbContext> options)
    : DbContext(options)
{
  public DbSet<ServiceEvent> ServiceEvents => Set<ServiceEvent>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    var serviceEvent = modelBuilder.Entity<ServiceEvent>();
    serviceEvent.ToTable("ServiceEvents");
    serviceEvent.HasKey(item => item.Id);
    serviceEvent.Property(item => item.Id).HasMaxLength(64);
    serviceEvent.Property(item => item.Title).HasMaxLength(200);
    serviceEvent.Property(item => item.Location).HasMaxLength(200);
  }
}
